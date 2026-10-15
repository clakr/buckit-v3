import type { z } from "zod";

import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import type { DB } from "#/db";

import { getDB } from "#/db";
import { transactions, type Transaction } from "#/db/schema";
import { currencyCodec } from "#/lib/codecs";
import { InsufficientFundsError, NotFoundError } from "#/lib/errors";
import { authMiddleware } from "#/lib/middlewares";
import { formatCurrency } from "#/lib/utils";
import { checkUnallocated } from "#/modules/bank-accounts/figures.server";
import { verifyUserBankAccountMiddleware } from "#/modules/bank-accounts/middlewares";
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

    // Deleted between the middleware's ownership check and this read.
    if (!transaction)
      throw new NotFoundError("This transaction doesn't exist or may have been deleted.");

    return transaction;
  });

const NEGATIVE_UNALLOCATED_MESSAGE =
  "This change would result in a negative unallocated balance. Adjust the amount or add more income first.";

async function checkLogTransaction(
  db: DB,
  userId: string,
  data: z.output<typeof logTransactionSchema>,
) {
  const check = await checkUnallocated(db, userId, {
    kind: "add-transaction",
    bankAccountId: data.bankAccountId,
    type: data.type,
    amount: currencyCodec.decode(data.amount),
  });

  if (!check.ok) return { isValid: false, message: NEGATIVE_UNALLOCATED_MESSAGE };

  return { isValid: true, message: "ok" };
}

export const validateLogTransaction = createServerFn({
  method: "GET",
})
  .middleware([verifyUserBankAccountMiddleware])
  .validator(logTransactionSchema)
  .handler(async ({ context, data }) => checkLogTransaction(getDB(env.db), context.user.id, data));

export const logTransaction = createServerFn({
  method: "POST",
})
  .middleware([verifyUserBankAccountMiddleware])
  .validator(logTransactionSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const { isValid, message } = await checkLogTransaction(db, context.user.id, data);

    if (!isValid) throw new InsufficientFundsError(message);

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

async function checkEditTransaction(
  db: DB,
  userId: string,
  data: z.output<typeof editTransactionSchema>,
) {
  const check = await checkUnallocated(db, userId, {
    kind: "replace-transaction",
    transactionId: data.transactionId,
    type: data.type,
    amount: currencyCodec.decode(data.amount),
  });

  if (!check.ok) return { isValid: false, message: NEGATIVE_UNALLOCATED_MESSAGE };

  return { isValid: true, message: "ok" };
}

export const validateEditTransaction = createServerFn({
  method: "GET",
})
  .middleware([verifyUserTransactionMiddleware])
  .validator(editTransactionSchema)
  .handler(async ({ context, data }) => checkEditTransaction(getDB(env.db), context.user.id, data));

export const editTransaction = createServerFn({
  method: "POST",
})
  .middleware([verifyUserTransactionMiddleware])
  .validator(editTransactionSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const { isValid, message } = await checkEditTransaction(db, context.user.id, data);

    if (!isValid) throw new InsufficientFundsError(message);

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

function checkDeleteTransaction(db: DB, userId: string, transactionId: Transaction["id"]) {
  return checkUnallocated(db, userId, {
    kind: "remove-transactions",
    transactionIds: [transactionId],
  });
}

const DELETE_NEGATIVE_UNALLOCATED_MESSAGE =
  "This would leave a negative unallocated balance. Adjust allocations first.";

export const validateDeleteTransaction = createServerFn({
  method: "GET",
})
  .middleware([verifyUserTransactionMiddleware])
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const [check, transaction] = await Promise.all([
      checkDeleteTransaction(db, context.user.id, data.transactionId),
      db.query.transactions.findFirst({
        columns: { type: true, amount: true },
        where: { id: data.transactionId },
        with: { bankAccount: { columns: { currency: true } } },
      }),
    ]);

    if (!check.ok) return { isValid: false, message: DELETE_NEGATIVE_UNALLOCATED_MESSAGE };

    if (!transaction?.bankAccount)
      throw new NotFoundError("This transaction doesn't exist or may have been deleted.");

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
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const check = await checkDeleteTransaction(db, context.user.id, data.transactionId);

    if (!check.ok) throw new InsufficientFundsError(DELETE_NEGATIVE_UNALLOCATED_MESSAGE);

    return db.delete(transactions).where(eq(transactions.id, data.transactionId)).returning();
  });

export const getTransactions = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDB(env.db);

    return db.query.transactions.findMany({
      where: {
        bankAccount: {
          userId: context.user.id,
        },
      },
      with: {
        bankAccount: {
          columns: {
            name: true,
          },
        },
      },
    });
  });
