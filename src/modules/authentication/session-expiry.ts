import { createMiddleware, getRouterInstance } from "@tanstack/react-start";

import { SessionExpiredError } from "#/lib/errors";
import { leaveExpiredSession } from "#/modules/authentication/session";

export const sessionExpiryMiddleware = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    try {
      return await next();
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        void leaveExpiredSession(await getRouterInstance(), error);
      }

      throw error;
    }
  },
);
