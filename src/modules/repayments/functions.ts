import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import type { DB } from "#/db";

import { getDB } from "#/db";
import { debts, repayments, transactions, type Debt, type Transaction } from "#/db/schema";
import { currencyCodec } from "#/lib/codecs";
import { ConflictError, InsufficientFundsError, NotFoundError } from "#/lib/errors";
import { checkUnallocated } from "#/modules/bank-accounts/figures.server";
import { findOwnedBankAccount } from "#/modules/bank-accounts/ownership.server";
import { checkTransactionEdit, updateTransaction } from "#/modules/transactions/linked.server";

import { verifyUserDebtMiddleware } from "../debts/middlewares";
import { getLinkedTransactionType } from "../debts/utils";
import { editRepaymentSchema, logRepaymentSchema } from "./schemas";
import {
  describeInsufficientRepaymentAccount,
  isRepaymentDateBeforeDebt,
  REPAYMENT_BEFORE_DEBT_MESSAGE,
} from "./utils";

async function checkRepaymentBankAccount(
  db: DB,
  userId: string,
  data: {
    bankAccountId: string;
    currency: Debt["currency"];
    type: Transaction["type"];
    amount: Transaction["amount"];
  },
) {
  // `logRepayment` has no bank-account middleware of its own, so this is its ownership check.
  const account = await findOwnedBankAccount(db, userId, data.bankAccountId, {
    currency: data.currency,
  });

  // An unusable account isn't a shortfall: wrong currency, missing, or not the user's.
  if (!account) throw new NotFoundError("The selected account is invalid for this repayment.");

  const check = await checkUnallocated(db, userId, {
    kind: "add-transaction",
    bankAccountId: data.bankAccountId,
    type: data.type,
    amount: data.amount,
  });

  if (!check.ok) {
    throw new InsufficientFundsError(
      describeInsufficientRepaymentAccount({
        bankAccount: check.bankAccount,
        available: check.available,
      }),
    );
  }
}

export const logRepayment = createServerFn({
  method: "POST",
})
  .middleware([verifyUserDebtMiddleware])
  .validator(logRepaymentSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    // The middleware has proven it's the user's; it can still be deleted in between.
    const debt = await db.query.debts.findFirst({
      where: { id: data.debtId },
      columns: { direction: true, currency: true, date: true },
    });
    if (!debt) throw new NotFoundError("This debt doesn't exist or may have been deleted.");

    if (isRepaymentDateBeforeDebt(data.date, debt.date)) {
      throw new ConflictError(REPAYMENT_BEFORE_DEBT_MESSAGE);
    }

    const amount = currencyCodec.decode(data.amount);

    // A genuine payment must not be swallowed by a "closed" status, so logging one
    // reopens a forgiven Debt in the same batch.
    const reopenDebtQuery = db
      .update(debts)
      .set({ forgivenAt: null })
      .where(eq(debts.id, data.debtId));

    if (!data.bankAccountId) {
      const [repaymentRows] = await db.batch([
        db
          .insert(repayments)
          .values({
            id: uuidv7(),
            debtId: data.debtId,
            amount,
            date: data.date,
            note: data.note,
          })
          .returning(),
        reopenDebtQuery,
      ]);

      return repaymentRows[0];
    }

    const type = getLinkedTransactionType(debt.direction, "repayment");

    // The write is the check: its error reaches the dialog's failure toast with this message.
    await checkRepaymentBankAccount(db, context.user.id, {
      bankAccountId: data.bankAccountId,
      currency: debt.currency,
      type,
      amount,
    });

    const transactionId = uuidv7();

    const [, repaymentRows] = await db.batch([
      db.insert(transactions).values({
        id: transactionId,
        bankAccountId: data.bankAccountId,
        type,
        amount,
        date: data.date,
        note: data.note,
      }),
      db
        .insert(repayments)
        .values({
          id: uuidv7(),
          debtId: data.debtId,
          transactionId,
        })
        .returning(),
      reopenDebtQuery,
    ]);

    return repaymentRows[0];
  });

export const editRepayment = createServerFn({
  method: "POST",
})
  .middleware([verifyUserDebtMiddleware])
  .validator(editRepaymentSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const repayment = await db.query.repayments.findFirst({
      where: { id: data.repaymentId, debtId: data.debtId },
      columns: { id: true },
      with: {
        debt: { columns: { date: true } },
        transaction: { columns: { id: true, type: true } },
      },
    });
    // `debt` is only nullable in the relation's type; `debtId` is NOT NULL.
    if (!repayment?.debt) {
      throw new NotFoundError("This repayment doesn't exist or may have been deleted.");
    }

    if (isRepaymentDateBeforeDebt(data.date, repayment.debt.date)) {
      throw new ConflictError(REPAYMENT_BEFORE_DEBT_MESSAGE);
    }

    if (!repayment.transaction) {
      const [updated] = await db
        .update(repayments)
        .set({
          amount: currencyCodec.decode(data.amount),
          date: data.date,
          note: data.note,
        })
        .where(eq(repayments.id, repayment.id))
        .returning();

      return updated;
    }

    // The Transaction is the source of truth, so the edit lands there, under the same Linked
    // Transaction rules and Unallocated check as an edit from the account page.
    const edit = {
      transactionId: repayment.transaction.id,
      type: repayment.transaction.type,
      amount: currencyCodec.decode(data.amount),
      date: data.date,
      note: data.note,
    };
    const check = await checkTransactionEdit(db, context.user.id, edit);

    if (!check.ok) {
      throw check.reason === "linked"
        ? new ConflictError(check.message)
        : new InsufficientFundsError(check.message);
    }

    await updateTransaction(db, edit);

    return repayment;
  });
