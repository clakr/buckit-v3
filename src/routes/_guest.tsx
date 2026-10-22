import { createFileRoute } from "@tanstack/react-router";

import { requireSignedOut } from "#/modules/authentication/guards";

export const Route = createFileRoute("/_guest")({
  ssr: true,
  beforeLoad: ({ context }) => requireSignedOut(context),
});
