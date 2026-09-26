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
import { INDEX_COLUMNS } from "#/modules/bank-accounts/columns";
import { useAddBankAccountDialogStore } from "#/modules/bank-accounts/components/add-bank-account-dialog";
import { bankAccountsQueryOption } from "#/modules/bank-accounts/query-options";

export const Route = createFileRoute("/_protected/accounts/")({
  loader: async ({ context: { queryClient } }) => {
    queryClient.query(bankAccountsQueryOption);
  },
  pendingComponent: () => (
    <Main>
      <Heading>Accounts</Heading>

      <StateTemplate
        state="loading"
        title="Loading accounts..."
        description="Fetching your bank accounts..."
      />
    </Main>
  ),
  errorComponent: ({ reset }) => (
    <Main>
      <Heading>Accounts</Heading>

      <StateTemplate
        state="error"
        title="Could not load accounts."
        description="We weren't able to retrieve your accounts. Please try again."
        content={<Button onClick={reset}>Retry</Button>}
      />
    </Main>
  ),
  component: RouteComponent,
});

function RouteComponent() {
  const { data: bankAccounts } = useSuspenseQuery(bankAccountsQueryOption);

  const isEmpty = bankAccounts.length === 0;

  const openDialog = useAddBankAccountDialogStore(useShallow((state) => state.openDialog));

  return (
    <Main>
      <div className="flex items-center justify-between">
        <Heading>Accounts</Heading>
        <Button onClick={openDialog}>
          <IconPlus />
          Add Account
        </Button>
      </div>

      {isEmpty ? (
        <StateTemplate
          state="empty"
          title="No accounts yet."
          description="Add your first bank account to start tracking."
          icon={<MODULE_ICONS.accounts />}
          content={
            <Button onClick={openDialog}>
              <IconPlus />
              Add Account
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={INDEX_COLUMNS}
          data={bankAccounts}
          initialSorting={[{ id: "lastTransactionDate", desc: true }]}
        />
      )}
    </Main>
  );
}
