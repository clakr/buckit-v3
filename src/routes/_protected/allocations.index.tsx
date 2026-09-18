import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { allocationsQueryOptions } from "#/modules/allocations/query-options";
import { transactionsQueryOptions } from "#/modules/transactions/query-options";

export const Route = createFileRoute("/_protected/allocations/")({
  loader: async ({ context: { queryClient } }) => {
    queryClient.query(transactionsQueryOptions);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data: allocations } = useSuspenseQuery(allocationsQueryOptions);

  return (
    <div>
      {allocations.map((a) => (
        <pre>{JSON.stringify(a, null, 2)}</pre>
      ))}
    </div>
  );
}
