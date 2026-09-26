import { IconPlus } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { MODULE_ICONS } from "#/lib/constants";
import { debtsQueryOptions } from "#/modules/debts/query-options";

export const Route = createFileRoute("/_protected/debts/")({
  loader: async ({ context: { queryClient } }) => {
    queryClient.query(debtsQueryOptions);
  },
  pendingComponent: () => (
    <Main>
      <div className="flex items-baseline justify-between">
        <Heading className="capitalize">Debts</Heading>
        <Button disabled>
          <IconPlus />
          Add
        </Button>
      </div>

      <StateTemplate
        state="loading"
        title="Loading debts..."
        description="Fetching debts details and history..."
      />
    </Main>
  ),
  errorComponent: ({ reset }) => (
    <Main>
      <Heading className="capitalize">Debts</Heading>
      <StateTemplate
        state="error"
        title="Could not load debts"
        description="We weren't able to retrieve this debts. Please check your connection and try again."
        content={<Button onClick={reset}>Retry</Button>}
      />
    </Main>
  ),
  component: RouteComponent,
});

function RouteComponent() {
  const { data: debts } = useSuspenseQuery(debtsQueryOptions);

  const isEmpty = debts.length === 0;

  return (
    <Main>
      <div className="flex items-baseline justify-between">
        <Heading className="capitalize">Debts</Heading>
        <Button disabled>
          <IconPlus />
          Log
        </Button>
      </div>

      {isEmpty ? (
        <StateTemplate
          state="empty"
          title="No debts yet."
          description="Create a debt" // @todo: reword to be consistent with sibling indexes
          icon={<MODULE_ICONS.debts />}
          content={
            <Button disabled>
              <IconPlus />
              Log
            </Button>
          }
        />
      ) : (
        <pre>{JSON.stringify(debts, null, 2)}</pre>
      )}
    </Main>
  );
}
