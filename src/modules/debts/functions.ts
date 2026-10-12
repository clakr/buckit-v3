import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { eq, inArray, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import { getDB } from "#/db";
import { debts, transactions } from "#/db/schema";
import { currencyCodec } from "#/lib/codecs";
import { authMiddleware } from "#/lib/middlewares";
import { verifyUserBankAccountMiddleware } from "#/modules/bank-accounts/middlewares";
import { getBankAccountUnallocatedBalance } from "#/modules/bank-accounts/utils";
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

export const validateDebtSourceBankAccount = createServerFn({
  method: "GET",
})
  .middleware([verifyUserBankAccountMiddleware])
  .validator(validateDebtSourceBankAccountSchema)
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
        message: "The source account is invalid for this debt.",
      };
    }

    return { isValid: true, message: "ok" };
  });

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

    const { isValid, message } = await validateDebtSourceBankAccount({
      data: {
        bankAccountId: data.bankAccountId,
        currency: data.currency,
      },
    });

    if (!isValid) throw new Error(message);

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

    return debt ?? null;
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

    if (!debt) throw new Error("No debt is linked to this user");

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

export const validateDeleteDebt = createServerFn({
  method: "GET",
})
  .middleware([verifyUserDebtMiddleware])
  .validator(deleteDebtSchema)
  .handler(async ({ data }) => {
    // Keeping the linked Transactions never changes a Balance — nothing to check.
    if (!data.deleteTransactions) return { isValid: true, message: "ok" };

    const db = getDB(env.db);

    const debt = await db.query.debts.findFirst({
      where: { id: data.debtId },
      columns: { originatingTransactionId: true },
      with: { repayments: { columns: { transactionId: true } } },
    });

    if (!debt) return { isValid: false, message: "No debt found." };

    const transactionIds = new Set(getDebtLinkedTransactionIds(debt));

    if (!transactionIds.size) return { isValid: true, message: "ok" };

    const linkedTransactions = await db.query.transactions.findMany({
      where: { id: { in: Array.from(transactionIds) } },
      columns: { bankAccountId: true },
      with: {
        bankAccount: {
          columns: { name: true, startingBalance: true },
          with: {
            transactions: { columns: { id: true, type: true, amount: true } },
            allocations: { columns: { amount: true } },
          },
        },
      },
    });

    // Several linked Transactions can share an account, so check each account once with
    // all of them removed — e.g. a receivable's repayment (income) leaving Savings can
    // push it below what's allocated from it.
    const bankAccountsById = new Map(
      linkedTransactions.flatMap((t) => (t.bankAccount ? [[t.bankAccountId, t.bankAccount]] : [])),
    );

    for (const bankAccount of bankAccountsById.values()) {
      const { unallocated } = getBankAccountUnallocatedBalance({
        startingBalance: bankAccount.startingBalance,
        transactions: bankAccount.transactions.filter((t) => !transactionIds.has(t.id)),
        allocations: bankAccount.allocations,
      });

      if (unallocated < 0) {
        return {
          isValid: false,
          message: `Deleting the linked transactions would leave "${bankAccount.name}" with a negative unallocated balance. Adjust its allocations first, or keep the transactions.`,
        };
      }
    }

    return { isValid: true, message: "ok" };
  });

export const deleteDebt = createServerFn({
  method: "POST",
})
  .middleware([verifyUserDebtMiddleware])
  .validator(deleteDebtSchema)
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const { isValid, message } = await validateDeleteDebt({ data });

    if (!isValid) throw new Error(message);

    const deleteDebtQuery = db.delete(debts).where(eq(debts.id, data.debtId)).returning();

    if (!data.deleteTransactions) return deleteDebtQuery;

    // Resolved before anything is deleted: the `debts` row's cascade takes its
    // `repayments` rows — and with them the repayment → Transaction links — along.
    const debt = await db.query.debts.findFirst({
      where: { id: data.debtId },
      columns: { originatingTransactionId: true },
      with: { repayments: { columns: { transactionId: true } } },
    });

    if (!debt) throw new Error("No debt found.");

    const transactionIds = getDebtLinkedTransactionIds(debt);

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
    if (!debt) throw new Error("No debt is linked to this user");

    const status = getDebtStatus(debt);
    if (status === "forgiven") throw new Error("This debt is already forgiven.");
    if (status === "settled") throw new Error("A settled debt has nothing left to forgive.");

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
