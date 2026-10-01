import { IconPlus } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useShallow } from "zustand/react/shallow";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { DataTable } from "#/components/ui/data-table";
import { MODULE_ICONS } from "#/lib/constants";
import { INDEX_COLUMNS } from "#/modules/debts/columns";
import { useRecordDebtDialogStore } from "#/modules/debts/components/record-debt-dialog";
import { debtsQueryOptions } from "#/modules/debts/query-options";

export const Route = createFileRoute("/_protected/debts/")({
  context: () => ({ debtsQueryOptions }),
  loader: async ({ context: { queryClient, debtsQueryOptions } }) => {
    return queryClient.query(debtsQueryOptions);
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
  errorComponent: ({ reset }) => (
    <Main>
      <Heading>Debts</Heading>

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
  const { debtsQueryOptions } = Route.useRouteContext();
  const { data: debts } = useSuspenseQuery(debtsQueryOptions);

  const isEmpty = debts.length === 0;

  const openDialog = useRecordDebtDialogStore(useShallow((state) => state.openDialog));

  return (
    <Main>
      <div className="flex items-center justify-between">
        <Heading>Debts</Heading>
        <Button onClick={openDialog}>
          <IconPlus />
          Record Debt
        </Button>
      </div>

      {isEmpty ? (
        <StateTemplate
          state="empty"
          title="No debts yet."
          description="Record your first debt to start tracking what you owe or are owed."
          icon={<MODULE_ICONS.debts />}
          content={
            <Button onClick={openDialog}>
              <IconPlus />
              Record Debt
            </Button>
          }
        />
      ) : (
        <DataTable columns={INDEX_COLUMNS} data={debts} />
      )}
    </Main>
  );
}
