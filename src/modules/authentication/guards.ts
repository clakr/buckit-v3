import type { QueryClient } from "@tanstack/react-query";

import { redirect } from "@tanstack/react-router";

import { sessionQueryOption } from "#/modules/authentication/query-options";

type GuardContext = { queryClient: QueryClient };

/** For signed-in pages: the User as route context, or a redirect to the login page. */
export async function requireSignedIn({ queryClient }: GuardContext) {
  const user = await queryClient.query(sessionQueryOption());

  if (!user) throw redirect({ to: "/" });

  return { user };
}

/** For signed-out pages (login, register): a redirect to the dashboard when already signed in. */
export async function requireSignedOut({ queryClient }: GuardContext) {
  const user = await queryClient.query(sessionQueryOption());

  if (user) throw redirect({ to: "/dashboard" });
}
