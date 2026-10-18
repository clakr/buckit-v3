import { createMiddleware } from "@tanstack/react-start";

import { requireUserId } from "#/modules/authentication/session.server";

/**
 * Who is this: the signed-in User's id as `context.userId`, or `UnauthorizedError`. Whether they
 * own a particular record is each module's own middleware.
 */
export const authMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) =>
  next({ context: { userId: await requireUserId() } }),
);
