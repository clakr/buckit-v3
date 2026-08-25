import type { PropsWithChildren } from "react";

import { IconPlus, IconWallet } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useShallow } from "zustand/react/shallow";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { DataTable } from "#/components/ui/data-table";
import { INDEX_COLUMNS } from "#/modules/accounts/columns";
import { useAddAccountDialogStore } from "#/modules/accounts/components/add-account-dialog";
import { bankAccountsQueryOption } from "#/modules/accounts/query-options";

export const Route = createFileRoute("/_protected/accounts/")({
  loader: async ({ context: { queryClient } }) => {
    queryClient.prefetchQuery(bankAccountsQueryOption);
  },
  pendingComponent: () => (
    <Template>
      <StateTemplate
        state="loading"
        title="Loading accounts..."
        description="Fetching your bank accounts..."
      />
    </Template>
  ),
  errorComponent: ({ reset }) => (
    <Template>
      <StateTemplate
        state="error"
        title="Could not load accounts."
        description="We weren't able to retrieve your accounts. Please try again."
        content={
          <>
            <Button onClick={reset}>Retry</Button>
            <Button render={<Link to="/accounts" />}>Go back to accounts</Button>
          </>
        }
      />
    </Template>
  ),
  component: RouteComponent,
});

function RouteComponent() {
  const { data: bankAccounts } = useSuspenseQuery(bankAccountsQueryOption);

  const isEmpty = bankAccounts.length === 0;

  const openDialog = useAddAccountDialogStore(useShallow((state) => state.openDialog));

  return (
    <Template>
      {isEmpty ? (
        <StateTemplate
          state="empty"
          title="No accounts yet."
          description="Add your first bank account to start tracking."
          icon={<IconWallet />}
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
    </Template>
  );
}

function Template({ children }: PropsWithChildren) {
  const openDialog = useAddAccountDialogStore(useShallow((state) => state.openDialog));

  return (
    <Main>
      <div className="flex items-center justify-between">
        <Heading>Accounts</Heading>
        <Button onClick={openDialog}>
          <IconPlus />
          Add Account
        </Button>
      </div>
      {children}
    </Main>
  );
}
