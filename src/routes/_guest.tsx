import { createFileRoute } from "@tanstack/react-router";

import { requireSignedOut } from "#/modules/authentication/guards";

export const Route = createFileRoute("/_guest")({
  ssr: "data-only",
  beforeLoad: ({ context }) => requireSignedOut(context),
});
