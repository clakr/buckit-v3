import { IconPlus } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { RouteRetryButton } from "#/components/route-retry-button";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { DataTable } from "#/components/ui/data-table";
import { DrawerTrigger } from "#/components/ui/drawer";
import { MODULE_ICONS } from "#/lib/constants";
import { formatPageTitle } from "#/lib/utils";
import { INDEX_COLUMNS } from "#/modules/debts/columns";
import { recordDebtDrawerHandle } from "#/modules/debts/components/record-debt-dialog";
import { debtsQueryOptions } from "#/modules/debts/query-options";

export const Route = createFileRoute("/_protected/debts/")({
  head: () => ({ meta: [{ title: formatPageTitle("Debts") }] }),
  context: () => ({ debtsQueryOptions }),
  loader: async ({ context: { queryClient, debtsQueryOptions } }) => {
    await queryClient.query(debtsQueryOptions);
  },
  pendingComponent: () => (
    <Main>
      <Heading>Debts</Heading>

      <StateTemplate
        state="loading"
        title="Loading debts..."
        description="Fetching your debts..."
      />
    </Main>
  ),
  errorComponent: () => (
    <Main>
      <Heading>Debts</Heading>

      <StateTemplate
        state="error"
        title="Could not load debts."
        description="We weren't able to retrieve your debts. Please try again."
        content={<RouteRetryButton />}
      />
    </Main>
  ),
  component: RouteComponent,
});

function RouteComponent() {
  const { debtsQueryOptions } = Route.useRouteContext();
  const { data: debts } = useSuspenseQuery(debtsQueryOptions);

  const isEmpty = debts.length === 0;

  return (
    <Main>
      <div className="flex items-center justify-between">
        <Heading>Debts</Heading>
        <DrawerTrigger handle={recordDebtDrawerHandle} render={<Button />}>
          <IconPlus />
          Record Debt
        </DrawerTrigger>
      </div>

      {isEmpty ? (
        <StateTemplate
          state="empty"
          title="No debts yet."
          description="Record your first debt to start tracking what you owe or are owed."
          icon={<MODULE_ICONS.debts />}
          content={
            <DrawerTrigger handle={recordDebtDrawerHandle} render={<Button />}>
              <IconPlus />
              Record Debt
            </DrawerTrigger>
          }
        />
      ) : (
        <DataTable columns={INDEX_COLUMNS} data={debts} />
      )}
    </Main>
  );
}
