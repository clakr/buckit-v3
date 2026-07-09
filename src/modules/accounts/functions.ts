import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";

import { getDB } from "#/db";
import { bankAccounts } from "#/db/schema";
import { authMiddleware } from "#/lib/middlewares";

export const getBankAccounts = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDB(env.db);

    return db.select().from(bankAccounts).where(eq(bankAccounts.userId, context.user.id));
  });
