import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { auth } from "#/integrations/better-auth";

export const authMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session) throw new Error("UNAUTHORIZED");

  return next({
    context: session,
  });
});
