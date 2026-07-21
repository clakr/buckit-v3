import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { uuidv7 } from "uuidv7";

import { getDB } from "#/db";
import { allocations } from "#/db/schema";
import { currencyCodec } from "#/lib/codecs";
import { authMiddleware } from "#/lib/middlewares";
import { logAllocationSchema } from "#/modules/allocations/schema";

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
