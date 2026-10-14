import type { z } from "zod";

import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import type { DB } from "#/db";

import { getDB } from "#/db";
import { allocations } from "#/db/schema";
import { currencyCodec } from "#/lib/codecs";
import { InsufficientFundsError } from "#/lib/errors";
import { authMiddleware } from "#/lib/middlewares";
import { formatCurrency } from "#/lib/utils";
import { verifyUserAllocationMiddleware } from "#/modules/allocations/middlewares";
import {
  editAllocationSchema,
  logAllocationSchema,
  validateEditAllocationAmountSchema,
  validateLogAllocationAmountSchema,
} from "#/modules/allocations/schemas";
import { checkUnallocated } from "#/modules/bank-accounts/figures.server";
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

    return allocation ?? null;
  });

async function checkLogAllocationAmount(
  db: DB,
  userId: string,
  data: Pick<z.output<typeof logAllocationSchema>, "bankAccountId" | "amount">,
) {
  const check = await checkUnallocated(db, userId, {
    kind: "add-allocation",
    bankAccountId: data.bankAccountId,
    amount: currencyCodec.decode(data.amount),
  });

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
    checkLogAllocationAmount(getDB(env.db), context.user.id, data),
  );

export const logAllocation = createServerFn({
  method: "POST",
})
  .middleware([verifyUserBankAccountMiddleware, verifyUserBucketMiddleware])
  .validator(logAllocationSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const { isValid, message } = await checkLogAllocationAmount(db, context.user.id, data);

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

async function checkEditAllocationAmount(
  db: DB,
  userId: string,
  data: Pick<z.output<typeof editAllocationSchema>, "allocationId" | "amount">,
) {
  const check = await checkUnallocated(db, userId, {
    kind: "replace-allocation",
    allocationId: data.allocationId,
    amount: currencyCodec.decode(data.amount),
  });

  if (!check.ok) {
    return {
      isValid: false,
      message: "Insufficient allocation amount.",
    };
  }

  return {
    isValid: true,
    message: "ok",
  };
}

export const validateEditAllocationAmount = createServerFn({
  method: "GET",
})
  .middleware([verifyUserAllocationMiddleware])
  .validator(validateEditAllocationAmountSchema)
  .handler(async ({ context, data }) =>
    checkEditAllocationAmount(getDB(env.db), context.user.id, data),
  );

export const editAllocation = createServerFn({
  method: "POST",
})
  .middleware([verifyUserAllocationMiddleware])
  .validator(editAllocationSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const { isValid, message } = await checkEditAllocationAmount(db, context.user.id, data);

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

export const getAllocations = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDB(env.db);

    return db.query.allocations.findMany({
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
