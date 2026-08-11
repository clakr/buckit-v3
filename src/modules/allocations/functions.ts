import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { uuidv7 } from "uuidv7";

import { getDB } from "#/db";
import { allocations } from "#/db/schema";
import { currencyCodec } from "#/lib/codecs";
import { authMiddleware } from "#/lib/middlewares";
import { formatCurrency } from "#/lib/utils";
import {
  logAllocationSchema,
  validateAllocationAmountSchema,
} from "#/modules/allocations/schema";

import { getAccountUnallocatedBalance } from "../accounts/utils";

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

export const validateAllocationAmount = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .validator(validateAllocationAmountSchema)
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
