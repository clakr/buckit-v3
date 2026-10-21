import { IconPlus } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { RouteRetryButton } from "#/components/route-retry-button";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { DataTable } from "#/components/ui/data-table";
import { MODULE_ICONS } from "#/lib/constants";
import { formatPageTitle } from "#/lib/utils";
import { INDEX_COLUMNS } from "#/modules/bank-accounts/columns";
import { useRegisterBankAccountDialogStore } from "#/modules/bank-accounts/components/register-bank-account-dialog";
import { bankAccountsQueryOption } from "#/modules/bank-accounts/query-options";

export const Route = createFileRoute("/_protected/accounts/")({
  head: () => ({ meta: [{ title: formatPageTitle("Accounts") }] }),
  context: () => ({ bankAccountsQueryOptions: bankAccountsQueryOption() }),
  loader: async ({ context: { queryClient, bankAccountsQueryOptions } }) => {
    return queryClient.query(bankAccountsQueryOptions);
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
  errorComponent: () => (
    <Main>
      <Heading>Accounts</Heading>

      <StateTemplate
        state="error"
        title="Could not load accounts."
        description="We weren't able to retrieve your accounts. Please try again."
        content={<RouteRetryButton />}
      />
    </Main>
  ),
  component: RouteComponent,
});

function RouteComponent() {
  const { bankAccountsQueryOptions } = Route.useRouteContext();
  const { data: bankAccounts } = useSuspenseQuery(bankAccountsQueryOptions);

  const isEmpty = bankAccounts.length === 0;

  const openDialog = useRegisterBankAccountDialogStore((state) => state.open);

  return (
    <Main>
      <div className="flex items-center justify-between">
        <Heading>Accounts</Heading>
        <Button onClick={() => openDialog()}>
          <IconPlus />
          Register Account
        </Button>
      </div>

      {isEmpty ? (
        <StateTemplate
          state="empty"
          title="No accounts yet."
          description="Add your first bank account to start tracking."
          icon={<MODULE_ICONS.accounts />}
          content={
            <Button onClick={() => openDialog()}>
              <IconPlus />
              Register Account
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
