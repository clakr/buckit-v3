import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { RouteRetryButton } from "#/components/route-retry-button";
import { StateTemplate } from "#/components/state-template";
import { CURRENCIES_CODES } from "#/lib/constants";
import { formatPageTitle } from "#/lib/utils";
import { AccountBreakdownChart } from "#/modules/dashboard/components/account-breakdown-chart";
import { BalanceTrendChart } from "#/modules/dashboard/components/balance-trend-chart";
import { CashflowChart } from "#/modules/dashboard/components/cashflow-chart";
import { CurrencySwitcher } from "#/modules/dashboard/components/currency-switcher";
import { DashboardActions } from "#/modules/dashboard/components/dashboard-actions";
import { GettingStartedCard } from "#/modules/dashboard/components/getting-started-card";
import { GoalLanesCard } from "#/modules/dashboard/components/goal-lanes-card";
import { KpiTiles } from "#/modules/dashboard/components/kpi-tiles";
import { OpenDebtsCard } from "#/modules/dashboard/components/open-debts-card";
import { RecentActivityCard } from "#/modules/dashboard/components/recent-activity-card";
import { dashboardQueryOptions } from "#/modules/dashboard/query-options";
import { selectCurrencySummary } from "#/modules/dashboard/utils";

const dashboardSearchSchema = z.object({
  currency: z.enum(CURRENCIES_CODES).optional().catch(undefined),
});

export const Route = createFileRoute("/_protected/dashboard")({
  head: () => ({ meta: [{ title: formatPageTitle("Dashboard") }] }),
  validateSearch: dashboardSearchSchema,
  context: () => ({ dashboardQueryOptions }),
  loader: async ({ context: { queryClient, dashboardQueryOptions } }) => {
    await queryClient.query(dashboardQueryOptions);
  },
  pendingComponent: () => (
    <Main>
      <Heading>Dashboard</Heading>

      <StateTemplate
        state="loading"
        title="Loading dashboard..."
        description="Fetching your accounts and debts..."
      />
    </Main>
  ),
  errorComponent: () => (
    <Main>
      <Heading>Dashboard</Heading>

      <StateTemplate
        state="error"
        title="Could not load dashboard."
        description="We weren't able to retrieve your overview. Please try again."
        content={<RouteRetryButton />}
      />
    </Main>
  ),
  component: RouteComponent,
});

function RouteComponent() {
  const { dashboardQueryOptions } = Route.useRouteContext();
  const { data } = useSuspenseQuery(dashboardQueryOptions);
  const { currency } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const summary = selectCurrencySummary(data.currencySummaries, currency);

  return (
    <Main>
      <div className="flex items-center justify-between">
        <Heading>Dashboard</Heading>
        <div className="flex items-center gap-x-3">
          <CurrencySwitcher
            currencies={data.currencySummaries.map((currencySummary) => currencySummary.currency)}
            value={summary.currency}
            onValueChange={(selectedCurrency) =>
              navigate({ search: { currency: selectedCurrency }, replace: true })
            }
          />
          <DashboardActions
            currency={summary.currency}
            accounts={summary.accounts}
            distributions={data.distributions}
            hasBucket={data.gettingStarted.hasBucket}
          />
        </div>
      </div>

      <GettingStartedCard
        currency={summary.currency}
        fundingBankAccountId={data.gettingStarted.fundingBankAccountId}
        hasBucket={data.gettingStarted.hasBucket}
        hasAllocation={data.gettingStarted.hasAllocation}
      />

      <KpiTiles summary={summary} />

      <div className="grid gap-3 lg:grid-cols-10">
        <BalanceTrendChart
          summary={summary}
          trendWindowStart={data.trendWindowStart}
          className="lg:col-span-6"
        />
        <CashflowChart summary={summary} className="lg:col-span-4" />
      </div>

      <AccountBreakdownChart summary={summary} />

      <div className="grid gap-3 *:h-148 lg:grid-cols-3">
        <GoalLanesCard summary={summary} />
        <OpenDebtsCard summary={summary} />
        <RecentActivityCard summary={summary} />
      </div>
    </Main>
  );
}
