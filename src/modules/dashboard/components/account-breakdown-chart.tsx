import { IconBuildingBank } from "@tabler/icons-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { StateTemplate } from "#/components/state-template";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "#/components/ui/chart";
import { formatMoney } from "#/lib/money";
import { type CurrencySummary } from "#/modules/dashboard/utils";

type AccountBreakdownChartProps = {
  summary: CurrencySummary;
};

const ROW_HEIGHT = 40;
const AXIS_HEIGHT = 56;

const chartConfig = {
  unallocated: { label: "Unallocated", color: "var(--chart-2)" },
  earmarked: { label: "Earmarked", color: "var(--chart-4)" },
} satisfies ChartConfig;

export function AccountBreakdownChart({ summary }: AccountBreakdownChartProps) {
  const { currency, accounts } = summary;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Where it sits</CardTitle>
        <CardDescription>
          {currency} Balance per Account, split into Unallocated and Earmarked
        </CardDescription>
      </CardHeader>
      <CardContent>
        {accounts.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto w-full"
            style={{ height: accounts.length * ROW_HEIGHT + AXIS_HEIGHT }}
          >
            <BarChart data={accounts} layout="vertical" margin={{ left: 0, right: 8 }}>
              <CartesianGrid horizontal={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={136}
                tickLine={false}
                axisLine={false}
                tickFormatter={(name: string) =>
                  name.length > 20 ? `${name.slice(0, 19)}…` : name
                }
              />
              <XAxis type="number" hide />
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
      </CardContent>
    </Card>
  );
}
