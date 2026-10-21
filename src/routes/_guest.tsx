import { createFileRoute } from "@tanstack/react-router";

import { requireSignedOut } from "#/modules/authentication/guards";

export const Route = createFileRoute("/_guest")({
  ssr: false,
  beforeLoad: ({ context }) => requireSignedOut(context),
});
