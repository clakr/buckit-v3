import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getSession } from "#/modules/authentication/functions";

export const Route = createFileRoute("/_protected")({
  component: Outlet,
  beforeLoad: async () => {
    const session = await getSession();
    if (!session)
      throw redirect({
        to: "/",
      });

    return { user: session.user };
  },
});
