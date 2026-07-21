import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { uuidv7 } from "uuidv7";

import { getDB } from "#/db";
import { allocations } from "#/db/schema";
import { currencyCodec } from "#/lib/codecs";
import { authMiddleware } from "#/lib/middlewares";
import { logAllocationSchema, validateAllocationAmountSchema } from "#/modules/allocations/schema";

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

    if (!bankAccount) throw new Error("No Account found.");

    const { unallocated } = getAccountUnallocatedBalance({
      startingBalance: bankAccount.startingBalance,
      transactions: bankAccount.transactions,
      allocations: bankAccount.allocations,
    });

    if (unallocated === 0) {
      return { isValid: false, unallocated: 0 };
    }

    return {
      isValid: unallocated >= data.amount,
      unallocated,
    };
  });
