import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import { getDB } from "#/db";
import { transactions } from "#/db/schema";
import { currencyCodec } from "#/lib/codecs";
import { formatCurrency } from "#/lib/utils";
import { verifyUserBankAccountMiddleware } from "#/modules/accounts/middlewares";
import { getAccountUnallocatedBalance } from "#/modules/accounts/utils";
import { verifyUserTransactionMiddleware } from "#/modules/transactions/middlewares";
import { editTransactionSchema, logTransactionSchema } from "#/modules/transactions/schemas";

export const getTransaction = createServerFn({
  method: "GET",
})
  .middleware([verifyUserTransactionMiddleware])
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const transaction = await db.query.transactions.findFirst({
      where: {
        id: data.transactionId,
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

export const validateLogTransaction = createServerFn({
  method: "GET",
})
  .middleware([verifyUserBankAccountMiddleware])
  .validator(logTransactionSchema)
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

    const { unallocated } = getAccountUnallocatedBalance({
      startingBalance: bankAccount.startingBalance,
      transactions: bankAccount.transactions,
      allocations: bankAccount.allocations,
    });

    if (data.type === "expense" && unallocated - currencyCodec.decode(data.amount) < 0) {
      return {
        isValid: false,
        message:
          "This change would result in a negative unallocated balance. Adjust the amount or add more income first.",
      };
    }

    return { isValid: true, message: "ok" };
  });

export const logTransaction = createServerFn({
  method: "POST",
})
  .middleware([verifyUserBankAccountMiddleware])
  .validator(logTransactionSchema)
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const { isValid, message } = await validateLogTransaction({
      data,
    });

    if (!isValid) throw new Error(message);

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

export const validateEditTransaction = createServerFn({
  method: "GET",
})
  .middleware([verifyUserTransactionMiddleware])
  .validator(editTransactionSchema)
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const transaction = await db.query.transactions.findFirst({
      where: {
        id: data.transactionId,
      },
      with: {
        bankAccount: {
          columns: {
            startingBalance: true,
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
        },
      },
    });

    if (!transaction) {
      return {
        isValid: false,
        message: "No transaction found.",
      };
    }

    if (!transaction.bankAccount) {
      return {
        isValid: false,
        message: "No account found.",
      };
    }

    const transactionsMap = new Map(transaction.bankAccount.transactions.map((t) => [t.id, t]));
    const targetTransaction = transactionsMap.get(data.transactionId);

    if (!targetTransaction) {
      return {
        isValid: false,
        message: "No transaction found.",
      };
    }

    targetTransaction.amount = currencyCodec.decode(data.amount);
    targetTransaction.type = data.type;

    const { unallocated } = getAccountUnallocatedBalance({
      startingBalance: transaction.bankAccount.startingBalance,
      transactions: Array.from(transactionsMap.values()),
      allocations: transaction.bankAccount.allocations,
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

export const editTransaction = createServerFn({
  method: "POST",
})
  .middleware([verifyUserTransactionMiddleware])
  .validator(editTransactionSchema)
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const { isValid, message } = await validateEditTransaction({
      data,
    });

    if (!isValid) throw new Error(message);

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

export const validateDeleteTransaction = createServerFn({
  method: "GET",
})
  .middleware([verifyUserTransactionMiddleware])
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const transaction = await db.query.transactions.findFirst({
      where: {
        id: data.transactionId,
      },
      with: {
        bankAccount: {
          columns: {
            startingBalance: true,
            currency: true,
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
        },
      },
    });

    if (!transaction) {
      return {
        isValid: false,
        message: "No transaction found.",
      };
    }

    if (!transaction.bankAccount) {
      return {
        isValid: false,
        message: "No account found.",
      };
    }

    const transactionsMap = new Map(transaction.bankAccount.transactions.map((t) => [t.id, t]));

    transactionsMap.delete(data.transactionId);

    const { unallocated } = getAccountUnallocatedBalance({
      startingBalance: transaction.bankAccount.startingBalance,
      transactions: Array.from(transactionsMap.values()),
      allocations: transaction.bankAccount.allocations,
    });

    if (unallocated < 0) {
      return {
        isValid: false,
        message: `This would leave a negative unallocated balance. Adjust allocations first.`,
      };
    }

    const amount = formatCurrency(currencyCodec.encode(transaction.amount), {
      currency: transaction.bankAccount.currency,
    });

    return {
      isValid: true,
      message: `This ${transaction.type} of ${amount} will be permanently removed.`,
    };
  });

export const deleteTransaction = createServerFn({
  method: "POST",
})
  .middleware([verifyUserTransactionMiddleware])
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const { isValid, message } = await validateDeleteTransaction({
      data,
    });

    if (!isValid) throw new Error(message);

    return db.delete(transactions).where(eq(transactions.id, data.transactionId)).returning();
  });
