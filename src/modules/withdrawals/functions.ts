import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { inArray } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import { getDB } from "#/db";
import { bankAccounts, transactions, withdrawals } from "#/db/schema";
import { InsufficientFundsError } from "#/lib/errors";
import { describeInsufficientHeld } from "#/lib/money";
import { verifyUserBankAccountMiddleware } from "#/modules/bank-accounts/middlewares";
import { checkHeld, getBucketsWithFigures } from "#/modules/buckets/figures.server";
import { verifyUserBucketMiddleware } from "#/modules/buckets/middlewares";
import { logWithdrawalSchema } from "#/modules/withdrawals/schemas";

export const getWithdrawals = createServerFn({
  method: "GET",
})
  .middleware([verifyUserBucketMiddleware])
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const rows = await db.query.withdrawals.findMany({
      where: {
        bucketId: data.bucketId,
        bucket: { userId: context.userId },
      },
      with: {
        transaction: {
          columns: { amount: true, date: true, note: true },
          with: {
            bankAccount: { columns: { id: true, name: true, currency: true } },
          },
        },
      },
    });

    return rows.map(({ transaction, ...withdrawal }) => ({
      id: withdrawal.id,
      bucketId: withdrawal.bucketId,
      amount: transaction.amount,
      date: transaction.date,
      note: transaction.note,
      bankAccount: transaction.bankAccount,
    }));
  });

// The Bank Accounts a Bucket holds money from, with how much it holds from each.
export const getWithdrawalSources = createServerFn({
  method: "GET",
})
  .middleware([verifyUserBucketMiddleware])
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const [bucket] = await getBucketsWithFigures(db, {
      userId: context.userId,
      bucketId: data.bucketId,
    });

    const holdings = bucket?.heldByBankAccount.filter((held) => held.amount > 0) ?? [];

    if (!holdings.length) return [];

    const sourceBankAccounts = await db
      .select({ id: bankAccounts.id, name: bankAccounts.name, currency: bankAccounts.currency })
      .from(bankAccounts)
      .where(
        inArray(
          bankAccounts.id,
          holdings.map((held) => held.bankAccountId),
        ),
      );

    return sourceBankAccounts
      .map((bankAccount) => ({
        ...bankAccount,
        held: holdings.find((held) => held.bankAccountId === bankAccount.id)?.amount ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

export const logWithdrawal = createServerFn({
  method: "POST",
})
  .middleware([verifyUserBankAccountMiddleware, verifyUserBucketMiddleware])
  .validator(logWithdrawalSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const check = await checkHeld(db, context.userId, {
      bucketId: data.bucketId,
      bankAccountId: data.bankAccountId,
      reduction: data.amount,
    });

    if (!check.ok)
      throw new InsufficientFundsError(
        describeInsufficientHeld({
          bucket: check.bucket,
          bankAccount: check.bankAccount,
          availableCents: check.available,
        }),
      );

    const transactionId = uuidv7();

    const [, withdrawalRows] = await db.batch([
      db.insert(transactions).values({
        id: transactionId,
        bankAccountId: data.bankAccountId,
        type: "expense",
        amount: data.amount,
        date: data.date,
        note: data.note,
      }),
      db
        .insert(withdrawals)
        .values({ id: uuidv7(), bucketId: data.bucketId, transactionId })
        .returning(),
    ]);

    return withdrawalRows[0];
  });
