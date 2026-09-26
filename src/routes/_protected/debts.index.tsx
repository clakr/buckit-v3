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
      <div className="flex items-center justify-between">
        <Heading>Debts</Heading>
        <Button disabled>
          <IconPlus />
          Log Debt
        </Button>
      </div>

      <StateTemplate
        state="loading"
        title="Loading debts..."
        description="Fetching your debts..."
      />
    </Main>
  ),
  errorComponent: ({ reset }) => (
    <Main>
      <div className="flex items-center justify-between">
        <Heading>Debts</Heading>
        <Button disabled>
          <IconPlus />
          Log Debt
        </Button>
      </div>

      <StateTemplate
        state="error"
        title="Could not load debts."
        description="We weren't able to retrieve your debts. Please try again."
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
      <div className="flex items-center justify-between">
        <Heading>Debts</Heading>
        <Button disabled>
          <IconPlus />
          Log Debt
        </Button>
      </div>

      {isEmpty ? (
        <StateTemplate
          state="empty"
          title="No debts yet."
          description="Log your first debt to start tracking what you owe or are owed."
          icon={<MODULE_ICONS.debts />}
          content={
            <Button disabled>
              <IconPlus />
              Log Debt
            </Button>
          }
        />
      ) : (
        <pre>{JSON.stringify(debts, null, 2)}</pre>
      )}
    </Main>
  );
}
