import type { QueryClient } from "@tanstack/react-query";

import { redirect } from "@tanstack/react-router";

import { sessionQueryOption } from "#/modules/authentication/query-options";

type GuardContext = { queryClient: QueryClient };

export async function requireSignedIn({ queryClient }: GuardContext) {
  const user = await queryClient.query(sessionQueryOption());

  if (!user) throw redirect({ to: "/" });

  return { user };
}

export async function requireSignedOut({ queryClient }: GuardContext) {
  const user = await queryClient.query(sessionQueryOption());

  if (user) throw redirect({ to: "/dashboard" });
}
