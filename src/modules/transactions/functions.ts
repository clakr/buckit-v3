import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { z } from "zod";

import { getDB } from "#/db";
import { transactions } from "#/db/schema";
import { currencyCodec } from "#/lib/codecs";
import { authMiddleware } from "#/lib/middlewares";
import { getAccountUnallocatedBalance } from "#/modules/accounts/utils";
import {
  editTransactionSchema,
  logTransactionSchema,
  validateEditTransactionSchema,
} from "#/modules/transactions/schema";

export const logTransaction = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .validator(logTransactionSchema)
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    return db
      .insert(transactions)
      .values({
        id: uuidv7(),
        bankAccountId: data.bankAccountId,
        type: data.type,
        amount: currencyCodec.decode(data.amount),
        date: data.date,
        note: data.note,
      })
      .returning();
  });

export const editTransaction = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .validator(editTransactionSchema)
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    return db
      .update(transactions)
      .set({
        type: data.type,
        amount: currencyCodec.decode(data.amount),
        date: data.date,
        note: data.note,
      })
      .where(eq(transactions.id, data.transactionId))
      .returning();
  });

export const getTransaction = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .validator(z.string())
  .handler(async ({ data: transactionId }) => {
    const db = getDB(env.db);

    const transaction = await db.query.transactions.findFirst({
      where: {
        id: transactionId,
      },
      with: {
        bankAccount: {
          columns: {
            currency: true,
          },
        },
      },
    });

    return transaction ?? null;
  });

export const validateEditTransaction = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .validator(validateEditTransactionSchema)
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const bankAccount = await db.query.bankAccounts.findFirst({
      columns: {
        startingBalance: true,
      },
      where: {
        id: data.bankAccountId,
      },
      with: {
        transactions: {
          columns: {
            id: true,
            type: true,
            amount: true,
          },
        },
        allocations: {
          columns: {
            amount: true,
          },
        },
      },
    });

    if (!bankAccount) {
      return {
        isValid: false,
        message: "No account found.",
      };
    }

    const transactionsMap = new Map(bankAccount.transactions.map((t) => [t.id, t]));
    const targetTransaction = transactionsMap.get(data.transactionId);

    if (!targetTransaction) {
      return {
        isValid: false,
        message: "No transaction found.",
      };
    }

    targetTransaction.amount = data.amount;
    targetTransaction.type = data.type;

    const { unallocated } = getAccountUnallocatedBalance({
      startingBalance: bankAccount.startingBalance,
      transactions: Array.from(transactionsMap.values()),
      allocations: bankAccount.allocations,
    });

    if (unallocated < 0) {
      return {
        isValid: false,
        message:
          "This change would result in a negative unallocated balance. Adjust the amount or add more income first.",
      };
    }

    return { isValid: true, message: "ok" };
  });
