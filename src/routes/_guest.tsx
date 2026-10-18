import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getSession } from "#/modules/authentication/functions";

export const Route = createFileRoute("/_guest")({
  ssr: false,
  component: Outlet,
  beforeLoad: async () => {
    const user = await getSession();
    if (!user) return;

    throw redirect({
      to: "/dashboard",
    });
  },
});
