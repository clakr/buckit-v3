import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { RouteRetryButton } from "#/components/route-retry-button";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { formatPageTitle } from "#/lib/utils";
import { logAllocationDrawerHandle } from "#/modules/allocations/components/log-allocation-drawer";
import { signOut } from "#/modules/authentication/session";
import { bankAccountsQueryOption } from "#/modules/bank-accounts/query-options";
import { bucketsQueryOptions } from "#/modules/buckets/query-options";
import { BankAccountPickerButton } from "#/modules/dashboard/components/bank-account-picker-button";
import { CurrencyTotalsCard } from "#/modules/dashboard/components/currency-totals-card";
import { GettingStartedChecklist } from "#/modules/dashboard/components/getting-started-checklist";
import { getCurrencyTotals } from "#/modules/dashboard/utils";
import { logTransactionDrawerHandle } from "#/modules/transactions/components/log-transaction-drawer";

export const Route = createFileRoute("/_protected/dashboard")({
  head: () => ({ meta: [{ title: formatPageTitle("Dashboard") }] }),
  context: () => ({
    bankAccountsQueryOptions: bankAccountsQueryOption(),
    bucketsQueryOptions,
  }),
  loader: async ({ context: { queryClient, bankAccountsQueryOptions, bucketsQueryOptions } }) => {
    await Promise.all([
      queryClient.query(bankAccountsQueryOptions),
      queryClient.query(bucketsQueryOptions),
    ]);
  },
  pendingComponent: () => (
    <Main>
      <Heading>Dashboard</Heading>

      <StateTemplate
        state="loading"
        title="Loading dashboard..."
        description="Fetching your accounts and buckets..."
      />
    </Main>
  ),
  errorComponent: () => (
    <Main>
      <Heading>Dashboard</Heading>

      <StateTemplate
        state="error"
        title="Could not load dashboard."
        description="We weren't able to retrieve your accounts and buckets. Please try again."
        content={<RouteRetryButton />}
      />
    </Main>
  ),
  component: RouteComponent,
});

function RouteComponent() {
  const { bankAccountsQueryOptions, bucketsQueryOptions } = Route.useRouteContext();
  const { data: bankAccounts } = useSuspenseQuery(bankAccountsQueryOptions);
  const { data: buckets } = useSuspenseQuery(bucketsQueryOptions);

  const router = useRouter();

  const currencyTotals = getCurrencyTotals(bankAccounts);
  const hasBankAccounts = bankAccounts.length > 0;

  function handleOpenLogTransactionDrawer(bankAccountId: string) {
    logTransactionDrawerHandle.openWithPayload({ bankAccountId });
  }

  function handleOpenLogAllocationDrawer(bankAccountId: string) {
    logAllocationDrawerHandle.openWithPayload({ start: { from: "bank-account", bankAccountId } });
  }

  return (
    <Main>
      <div className="flex items-center justify-between gap-x-3">
        <Heading>Dashboard</Heading>

        <div className="flex items-center gap-x-2">
          {hasBankAccounts ? (
            <>
              <BankAccountPickerButton
                label="Log Transaction"
                bankAccounts={bankAccounts}
                onSelect={handleOpenLogTransactionDrawer}
              />
              <BankAccountPickerButton
                label="Allocate Money"
                variant="outline"
                bankAccounts={bankAccounts}
                onSelect={handleOpenLogAllocationDrawer}
              />
            </>
          ) : null}
          <Button variant="ghost" onClick={() => signOut(router)}>
            logout
          </Button>
        </div>
      </div>

      <GettingStartedChecklist bankAccounts={bankAccounts} bucketCount={buckets.length} />

      {currencyTotals.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {currencyTotals.map((totals) => (
            <CurrencyTotalsCard key={totals.currency} totals={totals} />
          ))}
        </div>
      ) : null}
    </Main>
  );
}
