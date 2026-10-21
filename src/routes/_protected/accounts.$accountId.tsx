import { IconPencil } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { RouteRetryButton } from "#/components/route-retry-button";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "#/components/ui/card";
import { DataTable } from "#/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { loadOrThrowRouteNotFound } from "#/lib/errors";
import { formatMoney } from "#/lib/money";
import { formatPageTitle } from "#/lib/utils";
import { getAllocationColumns } from "#/modules/allocations/columns";
import { allocationsQueryOption } from "#/modules/allocations/query-options";
import { TRANSACTIONS_COLUMNS } from "#/modules/bank-accounts/columns";
import { useEditBankAccountDialogStore } from "#/modules/bank-accounts/components/edit-bank-account-dialog";
import { bankAccountQueryOption } from "#/modules/bank-accounts/query-options";

export const Route = createFileRoute("/_protected/accounts/$accountId")({
  head: () => ({ meta: [{ title: formatPageTitle("Account") }] }),
  context: ({ params }) => ({
    bankAccountQueryOptions: bankAccountQueryOption(params.accountId),
    allocationsQueryOptions: allocationsQueryOption({ bankAccountId: params.accountId }),
  }),
  loader: async ({
    context: { queryClient, bankAccountQueryOptions, allocationsQueryOptions },
  }) => {
    await loadOrThrowRouteNotFound(
      Promise.all([
        queryClient.query(bankAccountQueryOptions),
        queryClient.query(allocationsQueryOptions),
      ]),
    );
  },
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
          <Button variant="secondary" render={<Link to="/accounts" />}>
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

  function handleOpenEditBankAccountDialog() {
    useEditBankAccountDialogStore.getState().open({ bankAccountId: accountId });
  }

  return (
    <Main>
      <div className="flex items-baseline justify-between">
        <Heading className="capitalize">{bankAccount.name}</Heading>
        <Button variant="outline" onClick={handleOpenEditBankAccountDialog}>
          <IconPencil />
          Edit
        </Button>
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
            />
          </TabsContent>
          <TabsContent value="allocations">
            <DataTable
              columns={getAllocationColumns({ omit: "bankAccount" })}
              data={allocations}
              initialSorting={[{ id: "date", desc: true }]}
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
