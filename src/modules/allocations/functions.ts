import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import type { DB } from "#/db";

import { getDB } from "#/db";
import { allocations } from "#/db/schema";
import { currencyCodec } from "#/lib/codecs";
import { InsufficientFundsError, NotFoundError } from "#/lib/errors";
import { authMiddleware } from "#/lib/middlewares";
import { formatCurrency } from "#/lib/utils";
import { verifyUserAllocationMiddleware } from "#/modules/allocations/middlewares";
import {
  editAllocationSchema,
  getAllocationsSchema,
  logAllocationSchema,
  validateEditAllocationAmountSchema,
  validateLogAllocationAmountSchema,
} from "#/modules/allocations/schemas";
import { checkUnallocated, type BankAccountChange } from "#/modules/bank-accounts/figures.server";
import { verifyUserBankAccountMiddleware } from "#/modules/bank-accounts/middlewares";
import { verifyUserBucketMiddleware } from "#/modules/buckets/middlewares";

export const getAllocation = createServerFn({
  method: "GET",
})
  .middleware([verifyUserAllocationMiddleware])
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const allocation = await db.query.allocations.findFirst({
      where: {
        id: data.allocationId,
      },
      with: {
        bankAccount: {
          columns: {
            currency: true,
          },
        },
      },
    });

    // Gone between the ownership check and this read.
    if (!allocation)
      throw new NotFoundError("This allocation doesn't exist or may have been deleted.");

    return allocation;
  });

type AllocationAmountChange = Extract<
  BankAccountChange,
  { kind: "add-allocation" | "replace-allocation" }
>;

// "Available" is what the account can still set aside, counting an edited Allocation as returned,
// so it's the most this Allocation can be.
async function checkAllocationAmount(db: DB, userId: string, change: AllocationAmountChange) {
  const check = await checkUnallocated(db, userId, change);

  if (!check.ok) {
    return {
      isValid: false,
      message: `Insufficient unallocated balance in ${check.bankAccount.name}. Available: ${formatCurrency(
        currencyCodec.encode(check.available),
        {
          currency: check.bankAccount.currency,
        },
      )}`,
    };
  }

  return {
    isValid: true,
    message: "ok",
  };
}

export const validateLogAllocationAmount = createServerFn({
  method: "GET",
})
  .middleware([verifyUserBankAccountMiddleware])
  .validator(validateLogAllocationAmountSchema)
  .handler(async ({ context, data }) =>
    checkAllocationAmount(getDB(env.db), context.user.id, {
      kind: "add-allocation",
      bankAccountId: data.bankAccountId,
      amount: currencyCodec.decode(data.amount),
    }),
  );

export const logAllocation = createServerFn({
  method: "POST",
})
  .middleware([verifyUserBankAccountMiddleware, verifyUserBucketMiddleware])
  .validator(logAllocationSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const { isValid, message } = await checkAllocationAmount(db, context.user.id, {
      kind: "add-allocation",
      bankAccountId: data.bankAccountId,
      amount: currencyCodec.decode(data.amount),
    });

    if (!isValid) throw new InsufficientFundsError(message);

    return db
      .insert(allocations)
      .values({
        id: uuidv7(),
        bankAccountId: data.bankAccountId,
        bucketId: data.bucketId,
        amount: currencyCodec.decode(data.amount),
        date: data.date,
        note: data.note,
      })
      .returning();
  });

export const validateEditAllocationAmount = createServerFn({
  method: "GET",
})
  .middleware([verifyUserAllocationMiddleware])
  .validator(validateEditAllocationAmountSchema)
  .handler(async ({ context, data }) =>
    checkAllocationAmount(getDB(env.db), context.user.id, {
      kind: "replace-allocation",
      allocationId: data.allocationId,
      amount: currencyCodec.decode(data.amount),
    }),
  );

export const editAllocation = createServerFn({
  method: "POST",
})
  .middleware([verifyUserAllocationMiddleware])
  .validator(editAllocationSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const { isValid, message } = await checkAllocationAmount(db, context.user.id, {
      kind: "replace-allocation",
      allocationId: data.allocationId,
      amount: currencyCodec.decode(data.amount),
    });

    if (!isValid) throw new InsufficientFundsError(message);

    return db
      .update(allocations)
      .set({
        amount: currencyCodec.decode(data.amount),
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
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    return db.delete(allocations).where(eq(allocations.id, data.allocationId)).returning();
  });

/**
 * The user's Allocations, optionally for one Bucket or one Bank Account. Every row carries both
 * parents, so any page can show either. Someone else's Bucket or Bank Account reads as empty.
 */
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
          userId: context.user.id,
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
