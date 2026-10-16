import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { eq, inArray } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import type { DB } from "#/db";
import type { Debt } from "#/db/schema";

import { getDB } from "#/db";
import { debts, transactions } from "#/db/schema";
import { currencyCodec } from "#/lib/codecs";
import { ConflictError, InsufficientFundsError, NotFoundError } from "#/lib/errors";
import { authMiddleware } from "#/lib/middlewares";
import { checkUnallocated } from "#/modules/bank-accounts/figures.server";
import { findOwnedBankAccount } from "#/modules/bank-accounts/ownership.server";
import { loadDebtDeletionImpact } from "#/modules/debts/deletion.server";
import { deleteDebtSchema, editDebtSchema, recordDebtSchema } from "#/modules/debts/schemas";

import { getDebtsWithFigures } from "./figures.server";
import { verifyUserDebtMiddleware } from "./middlewares";
import {
  describeDeleteTransactionsShortfall,
  describeInsufficientSourceAccount,
  getLinkedTransactionType,
} from "./utils";

export const getDebts = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => getDebtsWithFigures(getDB(env.db), { userId: context.user.id }));

// `recordDebt` has no bank-account middleware of its own, so this is its ownership check too.
async function checkDebtSourceBankAccount(
  db: DB,
  userId: string,
  data: { bankAccountId: string; currency: Debt["currency"]; amount: Debt["amount"] },
) {
  const account = await findOwnedBankAccount(db, userId, data.bankAccountId, {
    currency: data.currency,
  });

  // An unusable source account isn't a shortfall: wrong currency, missing, or not the user's.
  if (!account) throw new NotFoundError("The source account is invalid for this debt.");

  // Funding a receivable takes money out, under the same never-negative rule as any other.
  const check = await checkUnallocated(db, userId, {
    kind: "add-transaction",
    bankAccountId: data.bankAccountId,
    type: getLinkedTransactionType("receivable", "origination"),
    amount: data.amount,
  });

  if (!check.ok) {
    throw new InsufficientFundsError(
      describeInsufficientSourceAccount({
        bankAccount: check.bankAccount,
        available: check.available,
      }),
    );
  }
}

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

    await checkDebtSourceBankAccount(db, context.user.id, {
      bankAccountId: data.bankAccountId,
      currency: data.currency,
      amount,
    });

    const transactionId = uuidv7();

    const [, debtRows] = await db.batch([
      db.insert(transactions).values({
        id: transactionId,
        bankAccountId: data.bankAccountId,
        type: getLinkedTransactionType(data.direction, "origination"),
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
  .handler(async ({ context, data }) => {
    const [debt] = await getDebtsWithFigures(getDB(env.db), {
      userId: context.user.id,
      debtIds: [data.debtId],
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

export const getDebtDeletionImpact = createServerFn({
  method: "GET",
})
  .middleware([verifyUserDebtMiddleware])
  .handler(async ({ context, data }) =>
    loadDebtDeletionImpact(getDB(env.db), context.user.id, data.debtId),
  );

export const deleteDebt = createServerFn({
  method: "POST",
})
  .middleware([verifyUserDebtMiddleware])
  .validator(deleteDebtSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const deleteDebtQuery = db.delete(debts).where(eq(debts.id, data.debtId)).returning();

    // Keeping the linked Transactions never changes a Balance: nothing to check.
    if (!data.deleteTransactions) return deleteDebtQuery;

    // Resolved before anything is deleted: the `debts` row's cascade takes its `repayments`
    // rows, and with them the repayment → Transaction links.
    const { linkedTransactionIds, shortfall } = await loadDebtDeletionImpact(
      db,
      context.user.id,
      data.debtId,
    );

    if (shortfall) throw new InsufficientFundsError(describeDeleteTransactionsShortfall(shortfall));

    if (!linkedTransactionIds.length) return deleteDebtQuery;

    const [, deleted] = await db.batch([
      db.delete(transactions).where(inArray(transactions.id, linkedTransactionIds)),
      deleteDebtQuery,
    ]);

    return deleted;
  });

export const forgiveDebt = createServerFn({
  method: "POST",
})
  .middleware([verifyUserDebtMiddleware])
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const [debt] = await getDebtsWithFigures(db, {
      userId: context.user.id,
      debtIds: [data.debtId],
    });
    if (!debt) throw new NotFoundError("This debt doesn't exist or may have been deleted.");

    // Reachable from a stale list (e.g. another tab forgave or settled it), so the toast says why.
    if (debt.status === "forgiven") throw new ConflictError("This debt is already forgiven.");
    if (debt.status === "settled") {
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
