import { useRouter } from "@tanstack/react-router";

import { Button } from "#/components/ui/button";

/**
 * Retry for a route's error screen. Re-runs the failed loaders; the error component's `reset`
 * only clears the boundary, so the same error shows again.
 */
export function RouteRetryButton() {
  const router = useRouter();

  return <Button onClick={() => router.invalidate()}>Retry</Button>;
}
