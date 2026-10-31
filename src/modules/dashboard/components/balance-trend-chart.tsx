import { IconChartAreaLine } from "@tabler/icons-react";
import { useId } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { InsetCard, InsetCardContent } from "#/components/inset-card";
import { StateTemplate } from "#/components/state-template";
import { CardDescription, CardTitle } from "#/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "#/components/ui/chart";
import { formatMoney } from "#/lib/money";
import { BALANCE_TREND_DAYS, DAY_MS } from "#/modules/bank-accounts/utils";
import { type CurrencySummary } from "#/modules/dashboard/utils";

type BalanceTrendChartProps = {
  summary: CurrencySummary;
  trendWindowStart: number;
  className?: string;
};

const chartConfig = {
  balance: { label: "Balance", color: "var(--chart-3)" },
} satisfies ChartConfig;

// Trend days are UTC days, so format them in UTC. The viewer's zone would shift every label.
function formatTrendDate(date: number, options: Intl.DateTimeFormatOptions) {
  return new Date(date).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
}

export function BalanceTrendChart({
  summary,
  trendWindowStart,
  className,
}: BalanceTrendChartProps) {
  const gradientId = `balance-trend-${useId().replace(/:/g, "")}`;
  const { currency, trend } = summary;

  const data = trend.closingBalances.map((balance, day) => ({
    date: trendWindowStart + day * DAY_MS,
    balance,
  }));

  return (
    <InsetCard className={className}>
      <InsetCardContent>
        <div className="flex flex-col gap-y-1">
          <CardTitle>Balance Trend</CardTitle>
          <CardDescription>
            Combined {currency} Balance over the last {BALANCE_TREND_DAYS} days
          </CardDescription>
        </div>

        {trend.hasActivity ? (
          <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-balance)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-balance)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                type="number"
                dataKey="date"
                domain={[trendWindowStart, trendWindowStart + (BALANCE_TREND_DAYS - 1) * DAY_MS]}
                scale="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={48}
                tickFormatter={(date: number) =>
                  formatTrendDate(date, { month: "short", day: "numeric" })
                }
              />
              <YAxis hide domain={["auto", "auto"]} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={(_, payload) =>
                      formatTrendDate(payload[0].payload.date, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    }
                    formatter={(value) => formatMoney(Number(value), currency)}
                  />
                }
              />
              <Area
                dataKey="balance"
                type="stepAfter"
                stroke="var(--color-balance)"
                strokeWidth={1.5}
                fill={`url(#${gradientId})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <StateTemplate
            state="empty"
            icon={<IconChartAreaLine />}
            title={`No ${currency} activity`}
            description={`Transactions in ${currency} over the last ${BALANCE_TREND_DAYS} days will chart here.`}
          />
        )}
      </InsetCardContent>
    </InsetCard>
  );
}
