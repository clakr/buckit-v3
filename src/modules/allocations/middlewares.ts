import { createMiddleware } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";

import { getDB } from "#/db";
import { allocations, bankAccounts } from "#/db/schema";
import { authMiddleware } from "#/lib/middlewares";
import { verifyUserAllocationMiddlewareSchema } from "#/modules/allocations/schemas";

export const verifyUserAllocationMiddleware = createMiddleware({
  type: "function",
})
  .middleware([authMiddleware])
  .validator(verifyUserAllocationMiddlewareSchema)
  .server(async ({ next, context, data }) => {
    const db = getDB(env.db);

    const result = await db
      .select()
      .from(bankAccounts)
      .innerJoin(allocations, eq(bankAccounts.id, allocations.bankAccountId))
      .where(and(eq(allocations.id, data.allocationId), eq(bankAccounts.userId, context.user.id)))
      .limit(1);

    if (!result) throw new Error("No allocation is linked to this user");

    return next();
  });
