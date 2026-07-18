import type { PropsWithChildren } from "react";

import { IconPlus, IconWallet } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useShallow } from "zustand/react/shallow";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { DataTable } from "#/components/ui/data-table";
import { columns } from "#/modules/accounts/columns";
import { bankAccountsQueryOptions } from "#/modules/accounts/query-options";
import { useDialogStore } from "#/stores/use-dialog";

export const Route = createFileRoute("/_protected/accounts")({
  loader: async ({ context: { queryClient } }) => {
    queryClient.prefetchQuery(bankAccountsQueryOptions);
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
        buttonText="Retry"
        handleButtonClick={reset}
      />
    </Template>
  ),
  component: RouteComponent,
});

function RouteComponent() {
  const { data: bankAccounts } = useSuspenseQuery(bankAccountsQueryOptions);

  const isEmpty = bankAccounts.length === 0;

  const openDialog = useDialogStore(useShallow((state) => state.openDialog));

  return (
    <Template>
      {isEmpty ? (
        <StateTemplate
          state="empty"
          title="No accounts yet."
          description="Add your first bank account to start tracking."
          icon={<IconWallet />}
          buttonText="Add Account"
          handleButtonClick={openDialog}
        />
      ) : (
        <DataTable columns={columns} data={bankAccounts} />
      )}
    </Template>
  );
}

function Template({ children }: PropsWithChildren) {
  const openDialog = useDialogStore(useShallow((state) => state.openDialog));

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
