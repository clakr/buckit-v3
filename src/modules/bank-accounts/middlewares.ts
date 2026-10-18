import { createMiddleware } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

import { getDB } from "#/db";
import { NotFoundError } from "#/lib/errors";
import { authMiddleware } from "#/modules/authentication/middlewares";
import { findOwnedBankAccount } from "#/modules/bank-accounts/ownership.server";
import { verifyUserBankAccountMiddlewareSchema } from "#/modules/bank-accounts/schemas";

export const verifyUserBankAccountMiddleware = createMiddleware({
  type: "function",
})
  .middleware([authMiddleware])
  .validator(verifyUserBankAccountMiddlewareSchema)
  .server(async ({ next, context, data }) => {
    const db = getDB(env.db);

    const result = await findOwnedBankAccount(db, context.userId, data.bankAccountId);

    // Someone else's account reads as missing too, so an ID can't be probed for existence.
    if (!result) throw new NotFoundError("This account doesn't exist or may have been deleted.");

    return next();
  });
