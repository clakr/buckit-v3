import {
  createRouter as createTanStackRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { ErrorScreen } from "#/components/error-screen";
import { LoadingScreen } from "#/components/loading-screen";
import { NotFoundScreen } from "#/components/not-found-screen";
import { getContext } from "#/integrations/tanstack-query/root-provider";
import { describeErrorForUser } from "#/lib/errors";
import { routeTree } from "#/routeTree.gen";

export function getRouter() {
  const context = getContext();

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
    defaultPendingComponent: LoadingScreen,
    defaultNotFoundComponent: NotFoundScreen,
  });

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient });

  return router;
}

function DefaultErrorComponent({ error }: ErrorComponentProps) {
  return (
    <ErrorScreen
      description={describeErrorForUser(
        error,
        "We couldn't load this page. Check your connection and try again.",
      )}
    />
  );
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
