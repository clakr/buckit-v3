import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { z } from "zod";

import { getDB } from "#/db";
import { allocations } from "#/db/schema";
import { currencyCodec } from "#/lib/codecs";
import { authMiddleware } from "#/lib/middlewares";
import { formatCurrency } from "#/lib/utils";
import { getAccountUnallocatedBalance } from "#/modules/accounts/utils";
import {
  editAllocationSchema,
  logAllocationSchema,
  validateLogAllocationAmountSchema,
  validateEditAllocationAmountSchema,
} from "#/modules/allocations/schema";

export const logAllocation = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .validator(logAllocationSchema)
  .handler(async ({ data }) => {
    const db = getDB(env.db);

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

export const validateLogAllocationAmount = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
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

    if (data.amount > unallocated) {
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

export const getAllocation = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .validator(z.string())
  .handler(async ({ data: allocationId }) => {
    const db = getDB(env.db);

    const allocation = await db.query.allocations.findFirst({
      where: {
        id: allocationId,
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

export const editAllocation = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .validator(editAllocationSchema)
  .handler(async ({ data }) => {
    const db = getDB(env.db);

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

export const validateEditAllocationAmount = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .validator(validateEditAllocationAmountSchema)
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
            id: true,
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

    const allocationsMap = new Map(bankAccount.allocations.map((a) => [a.id, a]));
    const targetAllocation = allocationsMap.get(data.allocationId);

    if (!targetAllocation) {
      return {
        isValid: false,
        message: "No allocation found.",
      };
    }

    targetAllocation.amount = data.amount;

    const { unallocated } = getAccountUnallocatedBalance({
      startingBalance: bankAccount.startingBalance,
      transactions: bankAccount.transactions,
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
