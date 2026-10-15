import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { allocationsQueryOption } from "#/modules/allocations/query-options";

export const Route = createFileRoute("/_protected/allocations/")({
  context: () => ({ allocationsQueryOptions: allocationsQueryOption() }),
  loader: async ({ context: { queryClient, allocationsQueryOptions } }) => {
    return queryClient.query(allocationsQueryOptions);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { allocationsQueryOptions } = Route.useRouteContext();
  const { data: allocations } = useSuspenseQuery(allocationsQueryOptions);

  return (
    <div>
      {allocations.map((a) => (
        <pre>{JSON.stringify(a, null, 2)}</pre>
      ))}
    </div>
  );
}
