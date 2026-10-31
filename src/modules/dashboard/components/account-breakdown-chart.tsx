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
import { type CurrencySummary } from "#/modules/dashboard/utils";

type AccountBreakdownChartProps = {
  summary: CurrencySummary;
};

// Past this many Accounts, names no longer fit flat under their bars, so they tilt.
const FLAT_LABEL_LIMIT = 8;
const LABEL_LENGTH = 16;

const chartConfig = {
  unallocated: { label: "Unallocated", color: "var(--chart-2)" },
  earmarked: { label: "Earmarked", color: "var(--chart-4)" },
} satisfies ChartConfig;

export function AccountBreakdownChart({ summary }: AccountBreakdownChartProps) {
  const { currency, accounts } = summary;
  const isCrowded = accounts.length > FLAT_LABEL_LIMIT;

  return (
    <InsetCard>
      <InsetCardContent>
        <div className="flex flex-col gap-y-1">
          <CardTitle>Where It Sits</CardTitle>
          <CardDescription>
            {currency} Balance per Account, split into Unallocated and Earmarked
          </CardDescription>
        </div>

        {accounts.length > 0 ? (
          <ChartContainer config={chartConfig} className="aspect-auto h-80 w-full">
            <BarChart data={accounts} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="name"
                interval={0}
                height={isCrowded ? 96 : 30}
                angle={isCrowded ? -45 : 0}
                textAnchor={isCrowded ? "end" : "middle"}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(name: string) =>
                  name.length > LABEL_LENGTH ? `${name.slice(0, LABEL_LENGTH - 1)}…` : name
                }
              />
              <YAxis hide />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
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
              <ChartLegend content={<ChartLegendContent />} />
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
