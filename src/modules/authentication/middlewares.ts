import { createMiddleware } from "@tanstack/react-start";

import { requireUserId } from "#/modules/authentication/session.server";

export const authMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) =>
  next({ context: { userId: await requireUserId() } }),
);
