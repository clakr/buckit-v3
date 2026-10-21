import { createMiddleware } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

import { consumeAuthAttempt, requireUserId } from "#/modules/authentication/session.server";

export const privateResponseMiddleware = createMiddleware({ type: "function" }).server(
  ({ next }) => {
    setResponseHeader("Cache-Control", "private, no-store");
    setResponseHeader("Vary", "Cookie");

    return next();
  },
);

export const authMiddleware = createMiddleware({ type: "function" })
  .middleware([privateResponseMiddleware])
  .server(async ({ next }) => next({ context: { userId: await requireUserId() } }));

export function authAttemptLimitMiddleware(action: "sign-in" | "sign-up") {
  return createMiddleware({ type: "function" })
    .middleware([privateResponseMiddleware])
    .server(async ({ next }) => {
      await consumeAuthAttempt(action);

      return next();
    });
}
