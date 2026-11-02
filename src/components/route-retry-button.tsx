import { useRouter } from "@tanstack/react-router";

import { Button } from "#/components/ui/button";

// The error component's `reset` only clears the boundary, so the same loader error shows again.
export function RouteRetryButton() {
  const router = useRouter();

  return <Button onClick={() => router.invalidate()}>Retry</Button>;
}
