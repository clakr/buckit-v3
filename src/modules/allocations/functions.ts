import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import type { DB } from "#/db";

import { getDB } from "#/db";
import { allocations } from "#/db/schema";
import { InsufficientFundsError, NotFoundError } from "#/lib/errors";
import { describeAllocationAlreadyWithdrawn, describeInsufficientUnallocated } from "#/lib/money";
import { verifyUserAllocationMiddleware } from "#/modules/allocations/middlewares";
import { editAllocationSchema, logAllocationSchema } from "#/modules/allocations/schemas";
import {
  checkUnallocated,
  getBankAccountsWithFigures,
  type BankAccountChange,
} from "#/modules/bank-accounts/figures.server";
import { verifyUserBankAccountMiddleware } from "#/modules/bank-accounts/middlewares";
import {
  checkHeld,
  getBucketsWithFigures,
  getHeldFromBankAccount,
  type BucketChange,
} from "#/modules/buckets/figures.server";
import { verifyUserBucketMiddleware } from "#/modules/buckets/middlewares";

export const getAllocation = createServerFn({
  method: "GET",
})
  .middleware([verifyUserAllocationMiddleware])
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const allocation = await db.query.allocations.findFirst({
      where: {
        id: data.allocationId,
      },
    });

    if (!allocation)
      throw new NotFoundError("This allocation doesn't exist or may have been deleted.");

    const [[figures], [bucket]] = await Promise.all([
      getBankAccountsWithFigures(db, {
        userId: context.userId,
        bankAccountId: allocation.bankAccountId,
      }),
      getBucketsWithFigures(db, { userId: context.userId, bucketId: allocation.bucketId }),
    ]);

    if (!figures || !bucket)
      throw new NotFoundError("This allocation doesn't exist or may have been deleted.");

    const held = getHeldFromBankAccount(bucket, allocation.bankAccountId);

    return {
      ...allocation,
      bucket: { name: bucket.name },
      bankAccount: { name: figures.name, currency: figures.currency },
      available: figures.unallocated + allocation.amount,
      lowestAllowedAmount: Math.max(0, allocation.amount - held),
    };
  });

type AllocationAmountChange = Extract<
  BankAccountChange,
  { kind: "add-allocation" | "replace-allocation" }
>;

async function checkAllocationAmount(db: DB, userId: string, change: AllocationAmountChange) {
  const check = await checkUnallocated(db, userId, change);

  if (!check.ok)
    throw new InsufficientFundsError(
      describeInsufficientUnallocated({
        bankAccount: check.bankAccount,
        availableCents: check.available,
        historyBreach: check.historyBreach,
      }),
    );
}

async function assertAllocationHeld(
  db: DB,
  userId: string,
  change: Extract<BucketChange, { kind: "replace-allocation" | "remove-allocation" }>,
) {
  const allocation = await db.query.allocations.findFirst({
    columns: { amount: true },
    where: { id: change.allocationId },
  });

  if (!allocation)
    throw new NotFoundError("This allocation doesn't exist or may have been deleted.");

  const held = await checkHeld(db, userId, change);

  if (held.ok) return;

  throw new InsufficientFundsError(
    describeAllocationAlreadyWithdrawn({
      bucket: held.bucket,
      bankAccount: held.bankAccount,
      withdrawnCents: allocation.amount - held.available,
      change: change.kind === "remove-allocation" ? "delete" : "edit",
      historyBreach: held.historyBreach,
    }),
  );
}

export const logAllocation = createServerFn({
  method: "POST",
})
  .middleware([verifyUserBankAccountMiddleware, verifyUserBucketMiddleware])
  .validator(logAllocationSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    await checkAllocationAmount(db, context.userId, {
      kind: "add-allocation",
      bankAccountId: data.bankAccountId,
      amount: data.amount,
      date: data.date,
    });

    return db
      .insert(allocations)
      .values({
        id: uuidv7(),
        bankAccountId: data.bankAccountId,
        bucketId: data.bucketId,
        amount: data.amount,
        date: data.date,
        note: data.note,
      })
      .returning();
  });

export const editAllocation = createServerFn({
  method: "POST",
})
  .middleware([verifyUserAllocationMiddleware])
  .validator(editAllocationSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    await assertAllocationHeld(db, context.userId, {
      kind: "replace-allocation",
      allocationId: data.allocationId,
      amount: data.amount,
      date: data.date,
    });

    await checkAllocationAmount(db, context.userId, {
      kind: "replace-allocation",
      allocationId: data.allocationId,
      amount: data.amount,
      date: data.date,
    });

    return db
      .update(allocations)
      .set({
        amount: data.amount,
        date: data.date,
        note: data.note,
      })
      .where(eq(allocations.id, data.allocationId))
      .returning();
  });

export const deleteAllocation = createServerFn({
  method: "POST",
})
  .middleware([verifyUserAllocationMiddleware])
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    await assertAllocationHeld(db, context.userId, {
      kind: "remove-allocation",
      allocationId: data.allocationId,
    });

    return db.delete(allocations).where(eq(allocations.id, data.allocationId)).returning();
  });
