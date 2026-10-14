import type { z } from "zod";

import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import type { DB } from "#/db";

import { getDB } from "#/db";
import { debts, repayments, transactions } from "#/db/schema";
import { currencyCodec } from "#/lib/codecs";
import { InsufficientFundsError, NotFoundError } from "#/lib/errors";
import { checkUnallocated } from "#/modules/bank-accounts/figures.server";
import { verifyUserBankAccountMiddleware } from "#/modules/bank-accounts/middlewares";
import { editTransaction, validateEditTransaction } from "#/modules/transactions/functions";

import { verifyUserDebtMiddleware } from "../debts/middlewares";
import {
  editRepaymentSchema,
  logRepaymentSchema,
  validateRepaymentSourceBankAccountSchema,
} from "./schemas";
import { isRepaymentDateBeforeDebt } from "./utils";

export const validateRepaymentSourceBankAccount = createServerFn({
  method: "GET",
})
  .middleware([verifyUserBankAccountMiddleware])
  .validator(validateRepaymentSourceBankAccountSchema)
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const account = await db.query.bankAccounts.findFirst({
      where: {
        id: data.bankAccountId,
        currency: data.currency,
      },
      columns: { id: true },
    });

    if (!account) {
      return {
        isValid: false,
        message: "The selected account's currency doesn't match this debt.",
      };
    }

    return { isValid: true, message: "ok" };
  });

export const getRepaymentDebt = createServerFn({
  method: "GET",
})
  .middleware([verifyUserDebtMiddleware])
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const debt = await db.query.debts.findFirst({
      where: { id: data.debtId },
      columns: { direction: true, date: true },
    });

    if (!debt) throw new Error("No debt found.");

    return debt;
  });

export const validateLogRepaymentCurrency = createServerFn({
  method: "GET",
})
  .middleware([verifyUserDebtMiddleware])
  .validator(logRepaymentSchema)
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const debt = await db.query.debts.findFirst({
      where: { id: data.debtId },
      columns: { currency: true },
    });
    if (!debt) {
      return { isValid: false, message: "No debt found." };
    }

    // No Bank Account picked — this repayment is a pure record, nothing to match currencies against.
    if (!data.bankAccountId) {
      return { isValid: true, message: "ok" };
    }

    return validateRepaymentSourceBankAccount({
      data: { bankAccountId: data.bankAccountId, currency: debt.currency },
    });
  });

async function checkLogRepaymentBalance(
  db: DB,
  userId: string,
  data: z.output<typeof logRepaymentSchema>,
) {
  // No Bank Account picked: no money is moving, so there's no balance to check.
  if (!data.bankAccountId) return { isValid: true, message: "ok" };

  const debt = await db.query.debts.findFirst({
    where: { id: data.debtId },
    columns: { direction: true },
  });

  if (!debt) throw new NotFoundError("This debt doesn't exist or may have been deleted.");

  const check = await checkUnallocated(db, userId, {
    kind: "add-transaction",
    bankAccountId: data.bankAccountId,
    type: debt.direction === "receivable" ? "income" : "expense",
    amount: currencyCodec.decode(data.amount),
  });

  if (!check.ok) {
    return {
      isValid: false,
      message:
        "This repayment would result in a negative unallocated balance. Adjust the amount or add more income first.",
    };
  }

  return { isValid: true, message: "ok" };
}

export const validateLogRepaymentBalance = createServerFn({
  method: "GET",
})
  .middleware([verifyUserDebtMiddleware])
  .validator(logRepaymentSchema)
  .handler(async ({ context, data }) =>
    checkLogRepaymentBalance(getDB(env.db), context.user.id, data),
  );

export const logRepayment = createServerFn({
  method: "POST",
})
  .middleware([verifyUserDebtMiddleware])
  .validator(logRepaymentSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const { isValid: isCurrencyValid, message: currencyMessage } =
      await validateLogRepaymentCurrency({ data });
    if (!isCurrencyValid) throw new Error(currencyMessage);

    const { isValid: isBalanceValid, message: balanceMessage } = await checkLogRepaymentBalance(
      db,
      context.user.id,
      data,
    );
    if (!isBalanceValid) throw new InsufficientFundsError(balanceMessage);

    const debt = await getRepaymentDebt({ data: { debtId: data.debtId } });
    if (isRepaymentDateBeforeDebt(data.date, debt.date)) {
      throw new Error("A repayment can't be dated before its debt was recorded.");
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

    const type = debt.direction === "receivable" ? "income" : "expense";

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

export const validateEditRepayment = createServerFn({
  method: "GET",
})
  .middleware([verifyUserDebtMiddleware])
  .validator(editRepaymentSchema)
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    // Scoped by `debtId` too — the middleware only proves the Debt is the user's.
    const repayment = await db.query.repayments.findFirst({
      where: { id: data.repaymentId, debtId: data.debtId },
      columns: { id: true },
      with: { transaction: { columns: { id: true, type: true } } },
    });
    if (!repayment) {
      return { isValid: false, message: "No repayment found." };
    }

    // No Transaction — a pure record, no Balance to protect.
    if (!repayment.transaction) {
      return { isValid: true, message: "ok" };
    }

    return validateEditTransaction({
      data: {
        transactionId: repayment.transaction.id,
        type: repayment.transaction.type,
        amount: data.amount,
        date: data.date,
        note: data.note,
      },
    });
  });

export const editRepayment = createServerFn({
  method: "POST",
})
  .middleware([verifyUserDebtMiddleware])
  .validator(editRepaymentSchema)
  .handler(async ({ data }) => {
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
    if (!repayment?.debt) throw new Error("No repayment found.");

    if (isRepaymentDateBeforeDebt(data.date, repayment.debt.date)) {
      throw new Error("A repayment can't be dated before its debt was recorded.");
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

    // The Transaction is the source of truth, so the edit lands there — through the
    // Transaction module's own edit path, which re-checks the Balance.
    await editTransaction({
      data: {
        transactionId: repayment.transaction.id,
        type: repayment.transaction.type,
        amount: data.amount,
        date: data.date,
        note: data.note,
      },
    });

    return repayment;
  });
