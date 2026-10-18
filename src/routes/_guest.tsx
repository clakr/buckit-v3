import { createFileRoute, Outlet } from "@tanstack/react-router";

import { requireSignedOut } from "#/modules/authentication/guards";

export const Route = createFileRoute("/_guest")({
  ssr: false,
  component: Outlet,
  beforeLoad: ({ context }) => requireSignedOut(context),
});
