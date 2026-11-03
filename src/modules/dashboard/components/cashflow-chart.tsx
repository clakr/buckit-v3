import { IconChartBar } from "@tabler/icons-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  XAxis,
  YAxis,
  type BarShapeProps,
} from "recharts";

import { InsetCard, InsetCardContent } from "#/components/inset-card";
import { StateTemplate } from "#/components/state-template";
import { CardDescription, CardTitle } from "#/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "#/components/ui/chart";
import { formatMoney } from "#/lib/money";
import {
  CASHFLOW_MONTHS,
  type CurrencySummary,
  type MonthlyCashflow,
} from "#/modules/dashboard/utils";

type CashflowChartProps = {
  summary: CurrencySummary;
  className?: string;
};

const chartConfig = {
  income: { label: "Income", color: "var(--chart-2)" },
  expense: { label: "Expense", color: "var(--chart-4)" },
} satisfies ChartConfig;

type CashflowChartMonth = MonthlyCashflow & { isToDate: boolean };

function formatMonth(month: number, options: Intl.DateTimeFormatOptions) {
  return new Date(month).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
}

function CashflowBar(props: BarShapeProps) {
  const { isToDate } = props.payload as CashflowChartMonth;

  return <Rectangle {...props} fillOpacity={isToDate ? 0.45 : 1} />;
}

export function CashflowChart({ summary, className }: CashflowChartProps) {
  const { currency, cashflow } = summary;
  const months = cashflow.months.map((month, index): CashflowChartMonth => ({
    ...month,
    isToDate: index === cashflow.months.length - 1,
  }));

  return (
    <InsetCard className={className}>
      <InsetCardContent>
        <div className="flex flex-col gap-y-1">
          <CardTitle>Income vs Expense</CardTitle>
          <CardDescription>
            Monthly {currency} income against expense over the last {CASHFLOW_MONTHS} months,
            excluding Debts. The faded month is to date.
          </CardDescription>
        </div>

        {cashflow.hasActivity ? (
          <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
            <BarChart data={months} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(month: number) => formatMonth(month, { month: "short" })}
              />
              <YAxis hide />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      const { month, isToDate } = payload[0].payload as CashflowChartMonth;
                      const label = formatMonth(month, { month: "long", year: "numeric" });

                      return isToDate ? `${label} (to date)` : label;
                    }}
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
              <Bar
                dataKey="income"
                fill="var(--color-income)"
                radius={[4, 4, 0, 0]}
                shape={CashflowBar}
              />
              <Bar
                dataKey="expense"
                fill="var(--color-expense)"
                radius={[4, 4, 0, 0]}
                shape={CashflowBar}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <StateTemplate
            state="empty"
            icon={<IconChartBar />}
            title={`No ${currency} Income or Expense`}
            description={`Transactions in ${currency} over the last ${CASHFLOW_MONTHS} months, other than Debt movements, will chart here.`}
          />
        )}
      </InsetCardContent>
    </InsetCard>
  );
}
