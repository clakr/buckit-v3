import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { eq, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import { getDB } from "#/db";
import { debts, transactions } from "#/db/schema";
import { currencyCodec } from "#/lib/codecs";
import { authMiddleware } from "#/lib/middlewares";
import { verifyUserBankAccountMiddleware } from "#/modules/bank-accounts/middlewares";
import {
  editDebtSchema,
  recordDebtSchema,
  validateDebtSourceBankAccountSchema,
} from "#/modules/debts/schemas";

import { verifyUserDebtMiddleware } from "./middlewares";

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
