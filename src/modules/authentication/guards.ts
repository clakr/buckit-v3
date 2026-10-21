import type { QueryClient } from "@tanstack/react-query";
import type { ParsedLocation } from "@tanstack/react-router";

import { redirect } from "@tanstack/react-router";

import { sessionQueryOption } from "#/modules/authentication/query-options";

type GuardContext = { queryClient: QueryClient };

export async function requireSignedIn({ queryClient }: GuardContext, location: ParsedLocation) {
  const user = await queryClient.query(sessionQueryOption());

  if (!user) throw redirect({ to: "/", search: { redirect: location.href } });

  return { user };
}

export async function requireSignedOut({ queryClient }: GuardContext) {
  const user = await queryClient.query(sessionQueryOption());

  if (user) throw redirect({ to: "/dashboard" });
}
