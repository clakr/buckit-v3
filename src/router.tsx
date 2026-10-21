import {
  createRouter as createTanStackRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { Main } from "#/components/main";
import { NotFoundScreen } from "#/components/not-found-screen";
import { RouteRetryButton } from "#/components/route-retry-button";
import { StateTemplate } from "#/components/state-template";
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
    defaultPendingComponent: DefaultPendingComponent,
    defaultNotFoundComponent: DefaultNotFoundComponent,
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

function DefaultNotFoundComponent() {
  return (
    <NotFoundScreen
      title="Page not found"
      description="We couldn't find the page you're looking for. It may have been moved or no longer exists."
    />
  );
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
