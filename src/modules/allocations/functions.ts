import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import { getDB } from "#/db";
import { allocations } from "#/db/schema";
import { currencyCodec } from "#/lib/codecs";
import { formatCurrency } from "#/lib/utils";
import { verifyUserBankAccountMiddleware } from "#/modules/accounts/middlewares";
import { getAccountUnallocatedBalance } from "#/modules/accounts/utils";
import { verifyUserAllocationMiddleware } from "#/modules/allocations/middlewares";
import {
  editAllocationSchema,
  logAllocationSchema,
  validateEditAllocationAmountSchema,
  validateLogAllocationAmountSchema,
} from "#/modules/allocations/schemas";
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

export const validateLogAllocationAmount = createServerFn({
  method: "GET",
})
  .middleware([verifyUserBankAccountMiddleware])
  .validator(validateLogAllocationAmountSchema)
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const bankAccount = await db.query.bankAccounts.findFirst({
      columns: {
        startingBalance: true,
        name: true,
        currency: true,
      },
      where: {
        id: data.bankAccountId,
      },
      with: {
        transactions: {
          columns: {
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

    if (currencyCodec.decode(data.amount) > unallocated) {
      return {
        isValid: false,
        message: `Insufficient unallocated balance in ${bankAccount.name}. Available: ${formatCurrency(
          currencyCodec.encode(unallocated),
          {
            currency: bankAccount.currency,
          },
        )}`,
      };
    }

    return {
      isValid: true,
      message: "ok",
    };
  });

export const logAllocation = createServerFn({
  method: "POST",
})
  .middleware([verifyUserBankAccountMiddleware, verifyUserBucketMiddleware])
  .validator(logAllocationSchema)
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const { isValid, message } = await validateLogAllocationAmount({
      data: {
        bankAccountId: data.bankAccountId,
        amount: data.amount,
      },
    });

    if (!isValid) throw new Error(message);

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
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const allocation = await db.query.allocations.findFirst({
      where: {
        id: data.allocationId,
      },
      with: {
        bankAccount: {
          with: {
            transactions: {
              columns: {
                type: true,
                amount: true,
              },
            },
            allocations: {
              columns: {
                id: true,
                amount: true,
              },
            },
          },
        },
      },
    });

    if (!allocation) {
      return {
        isValid: false,
        message: "No allocation found.",
      };
    }

    if (!allocation.bankAccount) {
      return {
        isValid: false,
        message: "No account found.",
      };
    }

    const allocationsMap = new Map(
      allocation.bankAccount.allocations.map((a) => [a.id, a]),
    );
    const targetAllocation = allocationsMap.get(data.allocationId);

    if (!targetAllocation) {
      return {
        isValid: false,
        message: "No allocation found.",
      };
    }

    targetAllocation.amount = currencyCodec.decode(data.amount);

    const { unallocated } = getAccountUnallocatedBalance({
      startingBalance: allocation.bankAccount.startingBalance,
      transactions: allocation.bankAccount.transactions,
      allocations: Array.from(allocationsMap.values()),
    });

    if (unallocated < 0) {
      return {
        isValid: false,
        message: "Insufficient allocation amount.",
      };
    }

    return {
      isValid: true,
      message: "ok",
    };
  });

export const editAllocation = createServerFn({
  method: "POST",
})
  .middleware([verifyUserAllocationMiddleware])
  .validator(editAllocationSchema)
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const { isValid, message } = await validateEditAllocationAmount({
      data: {
        allocationId: data.allocationId,
        amount: data.amount,
      },
    });

    if (!isValid) throw new Error(message);

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
