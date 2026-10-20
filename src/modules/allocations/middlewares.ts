import { createMiddleware } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";

import { getDB } from "#/db";
import { allocations } from "#/db/schema";
import { NotFoundError } from "#/lib/errors";
import { verifyUserAllocationMiddlewareSchema } from "#/modules/allocations/schemas";
import { authMiddleware } from "#/modules/authentication/middlewares";
import { isOwnedThroughBankAccount } from "#/modules/bank-accounts/ownership.server";

export const verifyUserAllocationMiddleware = createMiddleware({
  type: "function",
})
  .middleware([authMiddleware])
  .validator(verifyUserAllocationMiddlewareSchema)
  .server(async ({ next, context, data }) => {
    const db = getDB(env.db);

    const [result] = await db
      .select({ id: allocations.id })
      .from(allocations)
      .where(
        and(
          eq(allocations.id, data.allocationId),
          isOwnedThroughBankAccount(db, context.userId, allocations.bankAccountId),
        ),
      )
      .limit(1);

    if (!result) throw new NotFoundError("This allocation doesn't exist or may have been deleted.");

    return next();
  });
