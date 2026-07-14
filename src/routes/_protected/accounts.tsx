import type { PropsWithChildren } from "react";

import { IconMoodWrrr, IconPlus, IconWallet } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useShallow } from "zustand/react/shallow";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { Button } from "#/components/ui/button";
import { DataTable } from "#/components/ui/data-table";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#/components/ui/empty";
import { Spinner } from "#/components/ui/spinner";
import { columns } from "#/modules/accounts/columns";
import { bankAccountsQueryOptions } from "#/modules/accounts/query-options";
import { useDialogStore } from "#/stores/use-dialog";

export const Route = createFileRoute("/_protected/accounts")({
  loader: async ({ context: { queryClient } }) => {
    queryClient.prefetchQuery(bankAccountsQueryOptions);
  },
  pendingComponent: () => (
    <Template>
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Spinner />
          </EmptyMedia>
          <EmptyTitle>Loading...</EmptyTitle>
          <EmptyDescription>Please wait while we fetch your data.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Template>
  ),
  errorComponent: ({ reset }) => (
    <Template>
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconMoodWrrr />
          </EmptyMedia>
          <EmptyTitle>Oops!</EmptyTitle>
          <EmptyDescription>Could not load accounts.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={() => reset()}>Retry</Button>
        </EmptyContent>
      </Empty>
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
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconWallet />
            </EmptyMedia>
            <EmptyTitle>No Accounts Yet</EmptyTitle>
            <EmptyDescription>Add your first bank account to start tracking.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={openDialog}>
              <IconPlus />
              Add Account
            </Button>
          </EmptyContent>
        </Empty>
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
