import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { eq, inArray } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import type { DB } from "#/db";
import type { Debt } from "#/db/schema";

import { getDB } from "#/db";
import { debts, transactions } from "#/db/schema";
import { ConflictError, InsufficientFundsError, NotFoundError } from "#/lib/errors";
import { describeInsufficientUnallocated } from "#/lib/money";
import { authMiddleware } from "#/modules/authentication/middlewares";
import { checkUnallocated } from "#/modules/bank-accounts/figures.server";
import { findOwnedBankAccount } from "#/modules/bank-accounts/ownership.server";
import { loadDebtDeletionImpact } from "#/modules/debts/deletion.server";
import { deleteDebtSchema, editDebtSchema, recordDebtSchema } from "#/modules/debts/schemas";

import { getDebtsWithFigures } from "./figures.server";
import { verifyUserDebtMiddleware } from "./middlewares";
import { describeDeleteTransactionsShortfall, getLinkedTransactionType } from "./utils";

export const getDebts = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => getDebtsWithFigures(getDB(env.db), { userId: context.userId }));

async function checkLoanFunds(
  db: DB,
  userId: string,
  data: { bankAccountId: string; amount: Debt["amount"] },
) {
  const check = await checkUnallocated(db, userId, {
    kind: "add-transaction",
    bankAccountId: data.bankAccountId,
    type: getLinkedTransactionType("receivable", "origination"),
    amount: data.amount,
  });

  if (!check.ok) {
    throw new InsufficientFundsError(
      describeInsufficientUnallocated({
        purpose: "loan",
        bankAccount: check.bankAccount,
        availableCents: check.available,
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

    const amount = data.amount;

    if (data.direction === "payable" || !data.bankAccountId) {
      const [debt] = await db
        .insert(debts)
        .values({
          id: debtId,
          userId: context.userId,
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

    const sourceBankAccount = await findOwnedBankAccount(db, context.userId, data.bankAccountId, {
      currency: data.currency,
    });

    if (!sourceBankAccount) throw new NotFoundError("The source account is invalid for this debt.");

    await checkLoanFunds(db, context.userId, { bankAccountId: data.bankAccountId, amount });

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
          userId: context.userId,
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
      userId: context.userId,
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

    if (debt.direction !== data.direction) {
      throw new ConflictError("A debt's direction can't be changed.");
    }

    const [updated] = await db
      .update(debts)
      .set({
        name: data.name,
        date: data.date,
        note: data.note || null,
        ...(data.direction === "payable" ? { amount: data.amount } : {}),
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
    loadDebtDeletionImpact(getDB(env.db), context.userId, data.debtId),
  );

export const deleteDebt = createServerFn({
  method: "POST",
})
  .middleware([verifyUserDebtMiddleware])
  .validator(deleteDebtSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const deleteDebtQuery = db.delete(debts).where(eq(debts.id, data.debtId)).returning();

    if (!data.deleteTransactions) return deleteDebtQuery;

    const { linkedTransactionIds, shortfall } = await loadDebtDeletionImpact(
      db,
      context.userId,
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
      userId: context.userId,
      debtIds: [data.debtId],
    });
    if (!debt) throw new NotFoundError("This debt doesn't exist or may have been deleted.");

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
