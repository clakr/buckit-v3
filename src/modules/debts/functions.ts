import type { z } from "zod";

import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { eq, inArray, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import type { DB } from "#/db";

import { getDB } from "#/db";
import { debts, transactions } from "#/db/schema";
import { currencyCodec } from "#/lib/codecs";
import { ConflictError, InsufficientFundsError, NotFoundError } from "#/lib/errors";
import { authMiddleware } from "#/lib/middlewares";
import { checkUnallocated } from "#/modules/bank-accounts/figures.server";
import { verifyUserBankAccountMiddleware } from "#/modules/bank-accounts/middlewares";
import { findOwnedBankAccount } from "#/modules/bank-accounts/ownership.server";
import {
  deleteDebtSchema,
  editDebtSchema,
  recordDebtSchema,
  validateDebtSourceBankAccountSchema,
} from "#/modules/debts/schemas";

import { verifyUserDebtMiddleware } from "./middlewares";
import { getDebtLinkedTransactionIds, getDebtStatus } from "./utils";

export const getDebts = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDB(env.db);

    return db.query.debts.findMany({
      where: {
        userId: context.user.id,
      },
      with: {
        repayments: {
          orderBy: { createdAt: "desc" },
          with: {
            transaction: {
              columns: { amount: true, date: true },
            },
          },
        },
      },
    });
  });

async function checkDebtSourceBankAccount(
  db: DB,
  userId: string,
  data: z.output<typeof validateDebtSourceBankAccountSchema>,
) {
  // `recordDebt` has no bank-account middleware of its own, so this is its ownership check.
  const account = await findOwnedBankAccount(db, userId, data.bankAccountId, {
    currency: data.currency,
  });

  if (!account) {
    return {
      isValid: false,
      isSourceInvalid: true,
      message: "The source account is invalid for this debt.",
    };
  }

  // Funding a receivable is an `expense`, under the same never-negative rule as any other.
  const check = await checkUnallocated(db, userId, {
    kind: "add-transaction",
    bankAccountId: data.bankAccountId,
    type: "expense",
    amount: currencyCodec.decode(data.amount),
  });

  if (!check.ok) {
    return {
      isValid: false,
      message:
        "This loan would result in a negative unallocated balance. Adjust the amount or pick another account.",
    };
  }

  return { isValid: true, message: "ok" };
}

export const validateDebtSourceBankAccount = createServerFn({
  method: "GET",
})
  .middleware([verifyUserBankAccountMiddleware])
  .validator(validateDebtSourceBankAccountSchema)
  .handler(async ({ context, data }) =>
    checkDebtSourceBankAccount(getDB(env.db), context.user.id, data),
  );

export const recordDebt = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .validator(recordDebtSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);
    const debtId = uuidv7();

    const amount = currencyCodec.decode(data.amount);

    if (data.direction === "payable" || !data.bankAccountId) {
      const [debt] = await db
        .insert(debts)
        .values({
          id: debtId,
          userId: context.user.id,
          direction: data.direction,
          currency: data.currency,
          amount,
          name: data.name,
          date: data.date,
          note: data.note || null,
        })
        .returning();

      return debt;
    }

    const { isValid, isSourceInvalid, message } = await checkDebtSourceBankAccount(
      db,
      context.user.id,
      {
        bankAccountId: data.bankAccountId,
        currency: data.currency,
        amount: data.amount,
      },
    );

    // An unusable source account isn't a shortfall: wrong currency, missing, or not the user's.
    if (!isValid) {
      throw isSourceInvalid ? new NotFoundError(message) : new InsufficientFundsError(message);
    }

    const transactionId = uuidv7();

    const [, debtRows] = await db.batch([
      db.insert(transactions).values({
        id: transactionId,
        bankAccountId: data.bankAccountId,
        type: "expense",
        amount,
        date: data.date,
        note: `Loan to "${data.name}"`,
      }),
      db
        .insert(debts)
        .values({
          id: debtId,
          originatingTransactionId: transactionId,
          userId: context.user.id,
          direction: data.direction,
          currency: data.currency,
          amount,
          name: data.name,
          date: data.date,
          note: data.note || null,
        })
        .returning(),
    ]);

    return debtRows[0];
  });

export const getDebt = createServerFn({
  method: "GET",
})
  .middleware([verifyUserDebtMiddleware])
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const debt = await db.query.debts.findFirst({
      where: {
        id: data.debtId,
      },
      with: {
        originatingTransaction: {
          columns: { id: true },
          with: { bankAccount: { columns: { id: true, name: true } } },
        },
        repayments: {
          // Oldest first, by the effective date: the linked Transaction's date wins
          // over the repayment's own (only set when there's no Transaction).
          orderBy: (repayment, { asc }) => [
            asc(
              sql`coalesce((select ${transactions.date} from ${transactions} where ${transactions.id} = ${repayment.transactionId}), ${repayment.date})`,
            ),
            asc(repayment.createdAt),
          ],
          with: {
            transaction: {
              columns: { amount: true, date: true, note: true },
              with: { bankAccount: { columns: { id: true, name: true } } },
            },
          },
        },
      },
    });

    if (!debt) throw new NotFoundError("This debt doesn't exist or may have been deleted.");

    return debt;
  });

export const editDebt = createServerFn({
  method: "POST",
})
  .middleware([verifyUserDebtMiddleware])
  .validator(editDebtSchema)
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const debt = await db.query.debts.findFirst({
      where: { id: data.debtId },
      columns: { direction: true },
    });

    if (!debt) throw new NotFoundError("This debt doesn't exist or may have been deleted.");

    if (debt.direction === "receivable" && data.amount !== undefined) {
      throw new Error("A receivable debt's amount can't be changed.");
    }

    const [updated] = await db
      .update(debts)
      .set({
        name: data.name,
        date: data.date,
        note: data.note || null,
        ...(data.amount === undefined ? {} : { amount: currencyCodec.decode(data.amount) }),
      })
      .where(eq(debts.id, data.debtId))
      .returning();

    return updated;
  });

// The debt's linked Transactions are resolved before anything is deleted: the `debts` row's
// cascade takes its `repayments` rows, and with them the repayment → Transaction links.
async function checkDeleteDebt(db: DB, userId: string, data: z.output<typeof deleteDebtSchema>) {
  // Keeping the linked Transactions never changes a Balance: nothing to check.
  if (!data.deleteTransactions) return { isValid: true, message: "ok", transactionIds: [] };

  const debt = await db.query.debts.findFirst({
    where: { id: data.debtId },
    columns: { originatingTransactionId: true },
    with: { repayments: { columns: { transactionId: true } } },
  });

  if (!debt) throw new NotFoundError("This debt doesn't exist or may have been deleted.");

  const transactionIds = getDebtLinkedTransactionIds(debt);

  // Several linked Transactions can share a Bank Account, so each account is checked once
  // with all of them removed: e.g. a receivable's repayment (income) leaving Savings can
  // push it below what's allocated from it.
  const check = await checkUnallocated(db, userId, {
    kind: "remove-transactions",
    transactionIds,
  });

  if (!check.ok) {
    return {
      isValid: false,
      message: `Deleting the linked transactions would leave "${check.bankAccount.name}" with a negative unallocated balance. Adjust its allocations first, or keep the transactions.`,
      transactionIds,
    };
  }

  return { isValid: true, message: "ok", transactionIds };
}

export const validateDeleteDebt = createServerFn({
  method: "GET",
})
  .middleware([verifyUserDebtMiddleware])
  .validator(deleteDebtSchema)
  .handler(async ({ context, data }) => {
    const { isValid, message } = await checkDeleteDebt(getDB(env.db), context.user.id, data);

    return { isValid, message };
  });

export const deleteDebt = createServerFn({
  method: "POST",
})
  .middleware([verifyUserDebtMiddleware])
  .validator(deleteDebtSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const { isValid, message, transactionIds } = await checkDeleteDebt(db, context.user.id, data);

    if (!isValid) throw new InsufficientFundsError(message);

    const deleteDebtQuery = db.delete(debts).where(eq(debts.id, data.debtId)).returning();

    if (!transactionIds.length) return deleteDebtQuery;

    const [, deleted] = await db.batch([
      db.delete(transactions).where(inArray(transactions.id, transactionIds)),
      deleteDebtQuery,
    ]);

    return deleted;
  });

export const forgiveDebt = createServerFn({
  method: "POST",
})
  .middleware([verifyUserDebtMiddleware])
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const debt = await db.query.debts.findFirst({
      where: { id: data.debtId },
      columns: { amount: true, forgivenAt: true },
      with: {
        repayments: {
          with: { transaction: { columns: { amount: true } } },
        },
      },
    });
    if (!debt) throw new NotFoundError("This debt doesn't exist or may have been deleted.");

    // Reachable from a stale list (e.g. another tab forgave or settled it), so the toast says why.
    const status = getDebtStatus(debt);
    if (status === "forgiven") throw new ConflictError("This debt is already forgiven.");
    if (status === "settled") {
      throw new ConflictError("A settled debt has nothing left to forgive.");
    }

    const [updated] = await db
      .update(debts)
      .set({ forgivenAt: new Date() })
      .where(eq(debts.id, data.debtId))
      .returning();

    return updated;
  });

export const unforgiveDebt = createServerFn({
  method: "POST",
})
  .middleware([verifyUserDebtMiddleware])
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const [updated] = await db
      .update(debts)
      .set({ forgivenAt: null })
      .where(eq(debts.id, data.debtId))
      .returning();

    return updated;
  });
