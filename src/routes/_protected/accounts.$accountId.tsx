import { IconPencil } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "#/components/ui/card";
import { DataTable } from "#/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { currencyCodec } from "#/lib/codecs";
import { formatCurrency } from "#/lib/utils";
import { ALLOCATIONS_COLUMNS, TRANSACTIONS_COLUMNS } from "#/modules/bank-accounts/columns";
import { useEditBankAccountDialogStore } from "#/modules/bank-accounts/components/edit-bank-account-dialog";
import { bankAccountQueryOption } from "#/modules/bank-accounts/query-options";
import { getBankAccountUnallocatedBalance } from "#/modules/bank-accounts/utils";

class BankAccountNotFoundError extends Error {
  constructor() {
    super();
  }
}

export const Route = createFileRoute("/_protected/accounts/$accountId")({
  loader: async ({ context: { queryClient }, params }) => {
    queryClient.query(bankAccountQueryOption(params.accountId));
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
  errorComponent: ({ error, reset }) => {
    if (error instanceof BankAccountNotFoundError)
      return (
        <Main>
          <Heading className="capitalize">Account</Heading>
          <StateTemplate
            state="error"
            title="Account not found"
            description="This account doesn't exist or may have been deleted."
            content={
              <Button variant="secondary" render={<Link to=".." />}>
                Go back to accounts
              </Button>
            }
          />
        </Main>
      );

    return (
      <Main>
        <Heading className="capitalize">Account</Heading>
        <StateTemplate
          state="error"
          title="Could not load account"
          description="We weren't able to retrieve this account. Please check your connection and try again."
          content={<Button onClick={reset}>Retry</Button>}
        />
      </Main>
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { accountId } = Route.useParams();

  const { data: bankAccount } = useSuspenseQuery(bankAccountQueryOption(accountId));
  if (!bankAccount) throw new BankAccountNotFoundError();

  const { balance, unallocated, totalAllocated } = getBankAccountUnallocatedBalance({
    startingBalance: bankAccount.startingBalance,
    transactions: bankAccount.transactions,
    allocations: bankAccount.allocations,
  });

  function handleOpenEditBankAccountDialog() {
    const state = useEditBankAccountDialogStore.getState();

    state.setBankAccountId(accountId);
    state.openDialog();
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
              columns={ALLOCATIONS_COLUMNS}
              data={bankAccount.allocations}
              initialSorting={[{ id: "date", desc: true }]}
            />
          </TabsContent>
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4  [&>dt]:text-end">
                <dd>Unallocated:</dd>
                <dt>
                  {formatCurrency(currencyCodec.encode(unallocated), {
                    currency: bankAccount.currency,
                  })}
                </dt>
                <dd>Total Allocated:</dd>
                <dt>
                  {formatCurrency(currencyCodec.encode(totalAllocated), {
                    currency: bankAccount.currency,
                  })}
                </dt>
              </dl>
            </CardContent>
            <CardFooter className=" border-t text-sm font-semibold">
              <dl className="grid basis-full grid-cols-[auto_minmax(0,1fr)] gap-x-4">
                <dd>Computed Balance:</dd>
                <dt className="text-end">
                  {formatCurrency(currencyCodec.encode(balance), {
                    currency: bankAccount.currency,
                  })}
                </dt>
              </dl>
            </CardFooter>
          </Card>
        </div>
      </Tabs>
    </Main>
  );
}
