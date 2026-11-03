import { IconBuildingBank, IconPlus } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { InsetCard, InsetCardContent, InsetCardFooter } from "#/components/inset-card";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { CardDescription, CardTitle } from "#/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "#/components/ui/chart";
import { DrawerTrigger } from "#/components/ui/drawer";
import { MODULE_ICONS } from "#/lib/constants";
import { formatMoney } from "#/lib/money";
import { registerBankAccountDrawerHandle } from "#/modules/bank-accounts/components/register-bank-account-drawer";
import { type AccountBreakdown, type CurrencySummary } from "#/modules/dashboard/utils";

type AccountBreakdownChartProps = {
  summary: CurrencySummary;
};

const VISIBLE_ACCOUNTS = 8;
const LABEL_LENGTH = 15;
const ROW_HEIGHT = 36;
const LEGEND_HEIGHT = 40;

const chartConfig = {
  unallocated: { label: "Unallocated", color: "var(--chart-2)" },
  earmarked: { label: "Earmarked", color: "var(--chart-4)" },
} satisfies ChartConfig;

type AccountBreakdownRow = AccountBreakdown & { total: number };

function getAccountBreakdownRows(accounts: AccountBreakdown[]): AccountBreakdownRow[] {
  const withTotal = (account: AccountBreakdown) => ({
    ...account,
    total: account.unallocated + account.earmarked,
  });

  if (accounts.length <= VISIBLE_ACCOUNTS) return accounts.map(withTotal);

  const visibleAccounts = accounts.slice(0, VISIBLE_ACCOUNTS - 1);
  const otherAccounts = accounts.slice(VISIBLE_ACCOUNTS - 1);

  return [
    ...visibleAccounts.map(withTotal),
    withTotal({
      id: "other",
      name: `Other (${otherAccounts.length})`,
      unallocated: otherAccounts.reduce((total, account) => total + account.unallocated, 0),
      earmarked: otherAccounts.reduce((total, account) => total + account.earmarked, 0),
    }),
  ];
}

export function AccountBreakdownChart({ summary }: AccountBreakdownChartProps) {
  const { currency, accounts } = summary;
  const rows = getAccountBreakdownRows(accounts);
  const rowsById = new Map(rows.map((row) => [row.id, row]));

  const compactMoneyFormat = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return (
    <InsetCard>
      <InsetCardContent>
        <div className="flex flex-col gap-y-1">
          <CardTitle>Where It Sits</CardTitle>
          <CardDescription>
            {currency} Balance per Account, split into Unallocated and Earmarked
          </CardDescription>
        </div>

        {rows.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto w-full"
            style={{ height: rows.length * ROW_HEIGHT + LEGEND_HEIGHT }}
          >
            <BarChart
              data={rows}
              layout="vertical"
              barCategoryGap={8}
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis type="number" domain={[0, "dataMax"]} hide />
              <YAxis
                type="category"
                dataKey="id"
                width={120}
                tickLine={false}
                axisLine={false}
                // Recharts wraps tick text to the axis width, so names render on one line here.
                tick={({ x, y, payload }) => {
                  const name = rowsById.get(String(payload.value))?.name ?? "";

                  return (
                    <text
                      x={x}
                      y={y}
                      dx={-8}
                      dy="0.355em"
                      textAnchor="end"
                      className="fill-muted-foreground"
                    >
                      {name.length > LABEL_LENGTH ? `${name.slice(0, LABEL_LENGTH - 1)}…` : name}
                    </text>
                  );
                }}
              />
              <YAxis
                yAxisId="total"
                orientation="right"
                type="category"
                dataKey="id"
                width={64}
                tickLine={false}
                axisLine={false}
                tickFormatter={(id: string) =>
                  compactMoneyFormat.format((rowsById.get(id)?.total ?? 0) / 100)
                }
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) =>
                      (payload[0]?.payload as AccountBreakdownRow | undefined)?.name
                    }
                    formatter={(value, name) => (
                      <div className="flex w-full items-center justify-between gap-x-4">
                        <span className="text-muted-foreground">
                          {chartConfig[name as keyof typeof chartConfig].label}
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          {formatMoney(Number(value), currency)}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
              <Bar dataKey="unallocated" stackId="balance" fill="var(--color-unallocated)" />
              <Bar dataKey="earmarked" stackId="balance" fill="var(--color-earmarked)" />
            </BarChart>
          </ChartContainer>
        ) : (
          <StateTemplate
            state="empty"
            icon={<IconBuildingBank />}
            title={`No ${currency} Accounts`}
            description={`Register a ${currency} Account to see where its money sits.`}
          />
        )}
        {accounts.length > VISIBLE_ACCOUNTS ? (
          <p className="shrink-0 text-center text-muted-foreground">
            Largest {VISIBLE_ACCOUNTS - 1} of {accounts.length} Accounts, the rest grouped as Other
          </p>
        ) : null}
      </InsetCardContent>
      <InsetCardFooter>
        <DrawerTrigger
          handle={registerBankAccountDrawerHandle}
          payload={{ currency }}
          render={<Button variant="outline" />}
        >
          <IconPlus />
          Register Account
        </DrawerTrigger>
        <Button nativeButton={false} render={<Link to="/accounts" />}>
          <MODULE_ICONS.accounts />
          View Accounts
        </Button>
      </InsetCardFooter>
    </InsetCard>
  );
}
