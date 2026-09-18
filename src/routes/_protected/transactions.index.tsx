import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { transactionsQueryOptions } from "#/modules/transactions/query-options";

export const Route = createFileRoute("/_protected/transactions/")({
  loader: async ({ context: { queryClient } }) => {
    queryClient.query(transactionsQueryOptions);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data: transactions } = useSuspenseQuery(transactionsQueryOptions);

  return (
    <div>
      {transactions.map((t) => (
        <pre>{JSON.stringify(t, null, 2)}</pre>
      ))}
    </div>
  );
}
