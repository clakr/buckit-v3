import { createMiddleware, getRouterInstance } from "@tanstack/react-start";

import { UnauthorizedError } from "#/lib/errors";
import { leaveExpiredSession } from "#/modules/authentication/session";

/**
 * Runs in the browser around every server-function call: queries, mutations, and direct calls
 * like name checks alike. A Session found gone signs the client out; the error still reaches the
 * caller, which should stay quiet about it.
 */
export const sessionExpiryMiddleware = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    try {
      return await next();
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        void leaveExpiredSession(await getRouterInstance(), error);
      }

      throw error;
    }
  },
);
