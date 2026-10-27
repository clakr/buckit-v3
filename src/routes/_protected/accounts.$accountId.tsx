import { IconArrowsExchange, IconPencil, IconPlus } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { RouteRetryButton } from "#/components/route-retry-button";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "#/components/ui/card";
import { DataTable } from "#/components/ui/data-table";
import { DrawerTrigger } from "#/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { MODULE_ICONS } from "#/lib/constants";
import { loadOrThrowRouteNotFound } from "#/lib/errors";
import { formatMoney } from "#/lib/money";
import { formatPageTitle } from "#/lib/utils";
import { getAllocationColumns } from "#/modules/allocations/columns";
import { logAllocationDrawerHandle } from "#/modules/allocations/components/log-allocation-drawer";
import { allocationsQueryOption } from "#/modules/allocations/query-options";
import { TRANSACTIONS_COLUMNS } from "#/modules/bank-accounts/columns";
import { editBankAccountDrawerHandle } from "#/modules/bank-accounts/components/edit-bank-account-drawer";
import { bankAccountQueryOption } from "#/modules/bank-accounts/query-options";
import { logTransactionDrawerHandle } from "#/modules/transactions/components/log-transaction-drawer";

export const Route = createFileRoute("/_protected/accounts/$accountId")({
  context: ({ params }) => ({
    bankAccountQueryOptions: bankAccountQueryOption(params.accountId),
    allocationsQueryOptions: allocationsQueryOption({ bankAccountId: params.accountId }),
  }),
  loader: async ({
    context: { queryClient, bankAccountQueryOptions, allocationsQueryOptions },
  }) => {
    const [bankAccount] = await loadOrThrowRouteNotFound(
      Promise.all([
        queryClient.query(bankAccountQueryOptions),
        queryClient.query(allocationsQueryOptions),
      ]),
    );

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
  const { bankAccountQueryOptions, allocationsQueryOptions } = Route.useRouteContext();

  const { data: bankAccount } = useSuspenseQuery(bankAccountQueryOptions);
  const { data: allocations } = useSuspenseQuery(allocationsQueryOptions);

  const { balance, unallocated, totalEarmarked } = bankAccount;

  return (
    <Main>
      <div className="flex items-baseline justify-between">
        <Heading className="capitalize">{bankAccount.name}</Heading>
        <DrawerTrigger
          handle={editBankAccountDrawerHandle}
          payload={{ bankAccountId: accountId }}
          render={<Button variant="outline" />}
        >
          <IconPencil />
          Edit
        </DrawerTrigger>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="allocations">Allocations</TabsTrigger>
        </TabsList>
        <div className="grid grid-cols-[minmax(0,1fr)_20rem] items-start gap-x-4">
          <TabsContent value="transactions">
            <DataTable
              columns={TRANSACTIONS_COLUMNS}
              data={bankAccount.transactions}
              initialSorting={[{ id: "date", desc: true }]}
              emptyState={
                <StateTemplate
                  state="empty"
                  title="No transactions yet."
                  description="Log income or an expense to track this account's balance."
                  icon={<IconArrowsExchange />}
                  content={
                    <DrawerTrigger
                      handle={logTransactionDrawerHandle}
                      payload={{ bankAccountId: accountId }}
                      render={<Button />}
                    >
                      <IconPlus />
                      Log Transaction
                    </DrawerTrigger>
                  }
                />
              }
            />
          </TabsContent>
          <TabsContent value="allocations">
            <DataTable
              columns={getAllocationColumns({ omit: "bankAccount" })}
              data={allocations}
              initialSorting={[{ id: "date", desc: true }]}
              emptyState={
                <StateTemplate
                  state="empty"
                  title="No allocations yet."
                  description="Move money from this account into a bucket."
                  icon={<MODULE_ICONS.buckets />}
                  content={
                    <DrawerTrigger
                      handle={logAllocationDrawerHandle}
                      payload={{ start: { from: "bank-account", bankAccountId: accountId } }}
                      render={<Button />}
                    >
                      <IconPlus />
                      Allocate Money
                    </DrawerTrigger>
                  }
                />
              }
            />
          </TabsContent>
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 [&>dt]:text-end [&>dt]:font-semibold">
                <dd>Unallocated:</dd>
                <dt>{formatMoney(unallocated, bankAccount.currency)}</dt>
                <dd>Total Earmarked:</dd>
                <dt>{formatMoney(totalEarmarked, bankAccount.currency)}</dt>
              </dl>
            </CardContent>
            <CardFooter className=" border-t text-sm font-semibold">
              <dl className="grid basis-full grid-cols-[auto_minmax(0,1fr)] gap-x-4">
                <dd>Computed Balance:</dd>
                <dt className="text-end">{formatMoney(balance, bankAccount.currency)}</dt>
              </dl>
            </CardFooter>
          </Card>
        </div>
      </Tabs>
    </Main>
  );
}
