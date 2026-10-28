import type { z } from "zod";

import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import type { DB } from "#/db";

import { getDB } from "#/db";
import { transactions, type Transaction } from "#/db/schema";
import { InsufficientFundsError, NotFoundError } from "#/lib/errors";
import {
  describeHistoryShortfall,
  describeInsufficientUnallocated,
  formatMoney,
} from "#/lib/money";
import { checkUnallocated } from "#/modules/bank-accounts/figures.server";
import { verifyUserBankAccountMiddleware } from "#/modules/bank-accounts/middlewares";
import {
  assertTransactionEditAllowed,
  describeLinkedTransactionDeletion,
  getTransactionLocks,
  loadTransactionLink,
  updateTransaction,
  type TransactionEdit,
} from "#/modules/transactions/linked.server";
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

    if (!transaction)
      throw new NotFoundError("This transaction doesn't exist or may have been deleted.");

    const link = await loadTransactionLink(db, transaction.id);

    return {
      ...transaction,
      link,
      locks: getTransactionLocks(link),
    };
  });

export const logTransaction = createServerFn({
  method: "POST",
})
  .middleware([verifyUserBankAccountMiddleware])
  .validator(logTransactionSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);
    const amount = data.amount;

    const check = await checkUnallocated(db, context.userId, {
      kind: "add-transaction",
      bankAccountId: data.bankAccountId,
      type: data.type,
      amount,
      date: data.date,
    });

    if (!check.ok)
      throw new InsufficientFundsError(
        describeInsufficientUnallocated({
          bankAccount: check.bankAccount,
          availableCents: check.available,
          historyBreach: check.historyBreach,
        }),
      );

    return db
      .insert(transactions)
      .values({
        id: uuidv7(),
        bankAccountId: data.bankAccountId,
        type: data.type,
        amount,
        date: data.date,
        note: data.note,
      })
      .returning();
  });

function toTransactionEdit(data: z.output<typeof editTransactionSchema>): TransactionEdit {
  return {
    transactionId: data.transactionId,
    type: data.type,
    amount: data.amount,
    date: data.date,
    note: data.note,
  };
}

export const editTransaction = createServerFn({
  method: "POST",
})
  .middleware([verifyUserTransactionMiddleware])
  .validator(editTransactionSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);
    const edit = toTransactionEdit(data);

    await assertTransactionEditAllowed(db, context.userId, edit);

    return updateTransaction(db, edit);
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

    const [check, transaction, link] = await Promise.all([
      checkDeleteTransaction(db, context.userId, data.transactionId),
      db.query.transactions.findFirst({
        columns: { type: true, amount: true },
        where: { id: data.transactionId },
        with: { bankAccount: { columns: { currency: true } } },
      }),
      loadTransactionLink(db, data.transactionId),
    ]);

    if (!check.ok) {
      return {
        isValid: false,
        message: check.historyBreach
          ? describeHistoryShortfall({
              bankAccount: check.bankAccount,
              historyBreach: check.historyBreach,
            })
          : DELETE_NEGATIVE_UNALLOCATED_MESSAGE,
      };
    }

    if (!transaction?.bankAccount)
      throw new NotFoundError("This transaction doesn't exist or may have been deleted.");

    const amount = formatMoney(transaction.amount, transaction.bankAccount.currency);

    return {
      isValid: true,
      message: [
        `This ${transaction.type} of ${amount} will be permanently removed.`,
        describeLinkedTransactionDeletion(link),
      ]
        .filter(Boolean)
        .join(" "),
    };
  });

export const deleteTransaction = createServerFn({
  method: "POST",
})
  .middleware([verifyUserTransactionMiddleware])
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const check = await checkDeleteTransaction(db, context.userId, data.transactionId);

    if (!check.ok) throw new InsufficientFundsError(DELETE_NEGATIVE_UNALLOCATED_MESSAGE);

    return db.delete(transactions).where(eq(transactions.id, data.transactionId)).returning();
  });
