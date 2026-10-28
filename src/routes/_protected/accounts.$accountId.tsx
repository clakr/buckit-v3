import { IconPencil, IconPlus } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { RouteRetryButton } from "#/components/route-retry-button";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { DrawerTrigger } from "#/components/ui/drawer";
import { loadOrThrowRouteNotFound } from "#/lib/errors";
import { formatPageTitle } from "#/lib/utils";
import { logAllocationDrawerHandle } from "#/modules/allocations/components/log-allocation-drawer";
import { AccountLedgerTable } from "#/modules/bank-accounts/components/account-ledger-table";
import { editBankAccountDrawerHandle } from "#/modules/bank-accounts/components/edit-bank-account-drawer";
import { bankAccountQueryOption } from "#/modules/bank-accounts/query-options";
import { logTransactionDrawerHandle } from "#/modules/transactions/components/log-transaction-drawer";

export const Route = createFileRoute("/_protected/accounts/$accountId")({
  context: ({ params }) => ({
    bankAccountQueryOptions: bankAccountQueryOption(params.accountId),
  }),
  loader: async ({ context: { queryClient, bankAccountQueryOptions } }) => {
    const bankAccount = await loadOrThrowRouteNotFound(queryClient.query(bankAccountQueryOptions));

    return { name: bankAccount.name };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: formatPageTitle(loaderData?.name ?? "Account") }],
  }),
  pendingComponent: () => (
    <Main>
      <Heading className="capitalize">Account</Heading>

      <StateTemplate
        state="loading"
        title="Loading account..."
        description="Fetching account details and history..."
      />
    </Main>
  ),
  notFoundComponent: () => (
    <Main>
      <Heading className="capitalize">Account</Heading>
      <StateTemplate
        state="error"
        title="Account not found"
        description="This account doesn't exist or may have been deleted."
        content={
          <Button variant="secondary" nativeButton={false} render={<Link to="/accounts" />}>
            Go back to accounts
          </Button>
        }
      />
    </Main>
  ),
  errorComponent: () => (
    <Main>
      <Heading className="capitalize">Account</Heading>
      <StateTemplate
        state="error"
        title="Could not load account"
        description="We weren't able to retrieve this account. Please check your connection and try again."
        content={<RouteRetryButton />}
      />
    </Main>
  ),
  component: RouteComponent,
});

function RouteComponent() {
  const { accountId } = Route.useParams();
  const { bankAccountQueryOptions } = Route.useRouteContext();

  const { data: bankAccount } = useSuspenseQuery(bankAccountQueryOptions);

  return (
    <Main>
      <div className="flex items-baseline justify-between">
        <Heading className="capitalize">{bankAccount.name}</Heading>
        <div className="flex gap-x-2">
          <DrawerTrigger
            handle={editBankAccountDrawerHandle}
            payload={{ bankAccountId: accountId }}
            render={<Button variant="outline" />}
          >
            <IconPencil />
            Edit
          </DrawerTrigger>
          <DrawerTrigger
            handle={logAllocationDrawerHandle}
            payload={{ start: { from: "bank-account", bankAccountId: accountId } }}
            render={<Button variant="outline" />}
          >
            <IconPlus />
            Allocate Money
          </DrawerTrigger>
          <DrawerTrigger
            handle={logTransactionDrawerHandle}
            payload={{ bankAccountId: accountId }}
            render={<Button />}
          >
            <IconPlus />
            Log Transaction
          </DrawerTrigger>
        </div>
      </div>

      <AccountLedgerTable bankAccount={bankAccount} />
    </Main>
  );
}
