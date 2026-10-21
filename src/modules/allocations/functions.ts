import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import type { DB } from "#/db";

import { getDB } from "#/db";
import { allocations, type Allocation } from "#/db/schema";
import { InsufficientFundsError, NotFoundError } from "#/lib/errors";
import { describeAllocationAlreadyWithdrawn, describeInsufficientUnallocated } from "#/lib/money";
import { verifyUserAllocationMiddleware } from "#/modules/allocations/middlewares";
import {
  editAllocationSchema,
  getAllocationsSchema,
  logAllocationSchema,
} from "#/modules/allocations/schemas";
import { authMiddleware } from "#/modules/authentication/middlewares";
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
      // Whatever of this Allocation the Bucket no longer holds has been withdrawn, so it's also the
      // lowest the amount can go.
      alreadyWithdrawn: Math.max(0, allocation.amount - held),
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
      }),
    );
}

// Lowering or deleting an Allocation takes money back out of its Bucket, which can't go below
// what's already been withdrawn from that Bank Account.
async function assertAllocationReductionHeld(
  db: DB,
  userId: string,
  {
    allocationId,
    amount,
    change,
  }: { allocationId: Allocation["id"]; amount: number; change: "edit" | "delete" },
) {
  const allocation = await db.query.allocations.findFirst({
    columns: { amount: true, bucketId: true, bankAccountId: true },
    where: { id: allocationId },
  });

  if (!allocation)
    throw new NotFoundError("This allocation doesn't exist or may have been deleted.");

  const reduction = allocation.amount - amount;
  if (reduction <= 0) return;

  const held = await checkHeld(db, userId, {
    bucketId: allocation.bucketId,
    bankAccountId: allocation.bankAccountId,
    reduction,
  });

  if (held.ok) return;

  throw new InsufficientFundsError(
    describeAllocationAlreadyWithdrawn({
      bucket: held.bucket,
      bankAccount: held.bankAccount,
      withdrawnCents: allocation.amount - held.available,
      change,
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

    await assertAllocationReductionHeld(db, context.userId, {
      allocationId: data.allocationId,
      amount: data.amount,
      change: "edit",
    });

    await checkAllocationAmount(db, context.userId, {
      kind: "replace-allocation",
      allocationId: data.allocationId,
      amount: data.amount,
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

    await assertAllocationReductionHeld(db, context.userId, {
      allocationId: data.allocationId,
      amount: 0,
      change: "delete",
    });

    return db.delete(allocations).where(eq(allocations.id, data.allocationId)).returning();
  });

export const getAllocations = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .validator(getAllocationsSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    return db.query.allocations.findMany({
      where: {
        bankAccount: {
          userId: context.userId,
        },
        ...(data.bucketId ? { bucketId: data.bucketId } : {}),
        ...(data.bankAccountId ? { bankAccountId: data.bankAccountId } : {}),
      },
      with: {
        bankAccount: {
          columns: {
            id: true,
            name: true,
            currency: true,
          },
        },
        bucket: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });
  });
