import {
  createRouter as createTanStackRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { toast } from "sonner";

import type { UnauthorizedError } from "#/lib/errors";

import { Main } from "#/components/main";
import { RouteRetryButton } from "#/components/route-retry-button";
import { StateTemplate } from "#/components/state-template";
import { getContext } from "#/integrations/tanstack-query/root-provider";
import { describeErrorForUser } from "#/lib/errors";
import { routeTree } from "#/routeTree.gen";

export function getRouter() {
  let isLeavingExpiredSession = false;

  // Several queries can fail at once when the Session goes; only the first one signs out.
  function leaveExpiredSession(error: UnauthorizedError) {
    if (router.isServer || isLeavingExpiredSession) return;
    isLeavingExpiredSession = true;

    toast.error("Signed Out", { description: error.message });

    void router.navigate({ to: "/", replace: true }).finally(() => {
      // After leaving, so the protected pages' queries don't refetch into the same failure.
      context.queryClient.clear();
      isLeavingExpiredSession = false;
    });
  }

  const context = getContext({ onSessionExpired: leaveExpiredSession });

  const router = createTanStackRouter({
    routeTree,
    context,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultOnCatch: (error) => {
      console.error(error);
    },
    defaultErrorComponent: DefaultErrorComponent,
    defaultPendingComponent: DefaultPendingComponent,
  });

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient });

  return router;
}

function DefaultErrorComponent({ error }: ErrorComponentProps) {
  return (
    <Main>
      <StateTemplate
        state="error"
        title="Something went wrong"
        description={describeErrorForUser(
          error,
          "We weren't able to load this page. Please check your connection and try again.",
        )}
        content={<RouteRetryButton />}
      />
    </Main>
  );
}

function DefaultPendingComponent() {
  return (
    <Main>
      <StateTemplate state="loading" title="Loading" description="Just a moment..." />
    </Main>
  );
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
