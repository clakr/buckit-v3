import { IconArrowDownRight, IconArrowUpRight, IconMinus } from "@tabler/icons-react";
import { useId } from "react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";

import type { BankAccount } from "#/db/schema";
import type { AccountActivity, AccountActivityDay } from "#/modules/bank-accounts/activity";
import type { BankAccountFigures } from "#/modules/bank-accounts/utils";

import { ChartContainer, ChartTooltip, type ChartConfig } from "#/components/ui/chart";
import { formatMoney } from "#/lib/money";
import { cn } from "#/lib/utils";
import { getNetChangeTone } from "#/modules/bank-accounts/components/net-change-cell";
import { BALANCE_TREND_DAYS, DAY_MS } from "#/modules/bank-accounts/utils";

const chartConfig = {
  income: { label: "Income", color: "#0d9488" },
  expense: { label: "Expense", color: "#e11d48" },
  withdrawal: { label: "Withdrawal", theme: { light: "#f59e0b", dark: "#d97706" } },
} satisfies ChartConfig;

type FlowKey = keyof typeof chartConfig;

const FLOW_KEYS = Object.keys(chartConfig) as FlowKey[];

type Props = {
  bankAccount: Pick<BankAccount, "currency" | "createdAt"> & BankAccountFigures;
  activity: AccountActivity;
};

function formatActivityDate(date: number, options: Intl.DateTimeFormatOptions) {
  return new Date(date).toLocaleDateString("en-US", { ...options, timeZone: "UTC" });
}

export function BankAccountActivity({ bankAccount, activity }: Props) {
  const patternIdPrefix = `account-activity-${useId().replace(/:/g, "")}`;
  const { currency } = bankAccount;
  const { opening, days, windowStart } = activity;

  const totals = Object.fromEntries(
    FLOW_KEYS.map((key) => [key, days.reduce((sum, day) => sum + day[key], 0)]),
  ) as Record<FlowKey, number>;
  const hasActivity = FLOW_KEYS.some((key) => totals[key] > 0);

  const chartData = days.map((day) => ({
    ...day,
    expense: -day.expense,
    withdrawal: -day.withdrawal,
  }));

  const openedDate = Math.floor(bankAccount.createdAt.getTime() / DAY_MS) * DAY_MS;
  const isOpenedInWindow = openedDate >= windowStart;

  const compactMoneyFormat = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    notation: "compact",
  });

  return (
    <section aria-label="Account activity" className="flex flex-col gap-y-4 border-b p-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <dl className="flex flex-wrap items-end gap-x-8 gap-y-3">
          <AccountStat
            label="Balance"
            value={bankAccount.balance}
            change={bankAccount.balance - opening.balance}
            currency={currency}
          />
          <AccountStat
            label="Unallocated"
            value={bankAccount.unallocated}
            change={bankAccount.unallocated - opening.unallocated}
            currency={currency}
          />
          <AccountStat
            label="Earmarked"
            value={bankAccount.totalEarmarked}
            change={bankAccount.totalEarmarked - opening.totalEarmarked}
            currency={currency}
          />
          <span className="pb-1 text-xs text-muted-foreground">
            vs {BALANCE_TREND_DAYS} days ago
          </span>
        </dl>

        <ul
          aria-label={`Totals over the last ${BALANCE_TREND_DAYS} days`}
          className="flex rounded-md border bg-muted/50 text-xs max-sm:w-full max-sm:flex-col max-sm:divide-y sm:divide-x"
        >
          {FLOW_KEYS.map((key) => (
            <li key={key} className="flex items-center gap-x-1.5 px-2.5 py-1">
              <FlowSwatch flowKey={key} />
              <span className="text-muted-foreground">{chartConfig[key].label}</span>
              <span className="font-medium tabular-nums max-sm:ms-auto">
                {formatMoney(totals[key], currency)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {hasActivity ? (
        <ChartContainer config={chartConfig} className="aspect-auto h-44 w-full">
          <BarChart
            data={chartData}
            stackOffset="sign"
            barCategoryGap="20%"
            margin={{ top: 16, right: 0, bottom: 0, left: 0 }}
          >
            <defs>
              {FLOW_KEYS.map((key) => (
                <pattern
                  key={key}
                  id={`${patternIdPrefix}-${key}`}
                  width="4"
                  height="4"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <rect width="4" height="4" fill={`var(--color-${key})`} fillOpacity={0.2} />
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="4"
                    stroke={`var(--color-${key})`}
                    strokeWidth="2"
                  />
                </pattern>
              ))}
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(date: number) =>
                formatActivityDate(date, { month: "short", day: "numeric" })
              }
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              tickCount={5}
              tickFormatter={(value: number) => compactMoneyFormat.format(Math.abs(value) / 100)}
            />
            <ReferenceLine y={0} stroke="var(--border)" />
            {isOpenedInWindow ? (
              <ReferenceLine
                x={openedDate}
                stroke="var(--muted-foreground)"
                strokeDasharray="2 2"
                label={{
                  value: "Opened",
                  position: "insideTopLeft",
                  fill: "var(--foreground)",
                  fontSize: 11,
                  dy: -14,
                }}
              />
            ) : null}
            <ChartTooltip
              cursor={{ fill: "var(--muted)" }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <ActivityTooltip
                    day={payload[0].payload as AccountActivityDay}
                    currency={currency}
                  />
                ) : null
              }
            />
            {FLOW_KEYS.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="flow"
                maxBarSize={24}
                fill={`url(#${patternIdPrefix}-${key})`}
                isAnimationActive={false}
                shape={(props: FlowBarShapeProps) => (
                  <FlowBar {...props} flowKey={key} capAt={key === "income" ? "top" : "bottom"} />
                )}
              />
            ))}
          </BarChart>
        </ChartContainer>
      ) : (
        <p className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
          No income or expenses in the last {BALANCE_TREND_DAYS} days.
        </p>
      )}
    </section>
  );
}

function AccountStat({
  label,
  value,
  change,
  currency,
}: {
  label: string;
  value: number;
  change: number;
  currency: BankAccount["currency"];
}) {
  const Icon = change > 0 ? IconArrowUpRight : change < 0 ? IconArrowDownRight : IconMinus;

  return (
    <div className="flex flex-col gap-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="flex flex-wrap items-end gap-x-1.5">
        <span className="text-xl font-semibold">{formatMoney(value, currency)}</span>
        <span
          className={cn(
            "flex items-center gap-x-0.5 pb-1 text-xs font-medium tabular-nums",
            getNetChangeTone(change),
          )}
        >
          <Icon aria-hidden className="size-3.5" />
          {change > 0 ? "+" : ""}
          {formatMoney(change, currency)}
        </span>
      </dd>
    </div>
  );
}

function FlowSwatch({ flowKey }: { flowKey: FlowKey }) {
  return (
    <span
      aria-hidden
      className="size-2 shrink-0 rounded-full"
      style={{ backgroundColor: `var(--color-${flowKey})` }}
    />
  );
}

type FlowBarShapeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
};

function FlowBar({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  fill,
  flowKey,
  capAt,
}: FlowBarShapeProps & { flowKey: FlowKey; capAt: "top" | "bottom" }) {
  const top = Math.min(y, y + height);
  const barHeight = Math.abs(height);

  if (barHeight === 0) return null;

  const capHeight = Math.min(2, barHeight);

  return (
    <g>
      <rect x={x} y={top} width={width} height={barHeight} fill={fill} />
      <rect
        x={x}
        y={capAt === "top" ? top : top + barHeight - capHeight}
        width={width}
        height={capHeight}
        fill={`var(--color-${flowKey})`}
      />
    </g>
  );
}

function ActivityTooltip({
  day,
  currency,
}: {
  day: AccountActivityDay;
  currency: BankAccount["currency"];
}) {
  const flows = FLOW_KEYS.filter((key) => day[key] !== 0);

  return (
    <div className="grid min-w-40 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs/relaxed shadow-xl">
      <div className="font-medium">
        {formatActivityDate(day.date, { month: "short", day: "numeric", year: "numeric" })}
      </div>
      {flows.length ? (
        <div className="grid gap-1">
          {flows.map((key) => (
            <div key={key} className="flex items-center gap-x-2">
              <FlowSwatch flowKey={key} />
              <span className="text-muted-foreground">{chartConfig[key].label}</span>
              <span className="ms-auto font-mono font-medium tabular-nums">
                {formatMoney(Math.abs(day[key]), currency)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground">No income or expenses</span>
      )}
      <div className="flex items-center gap-x-4 border-t pt-1.5">
        <span className="text-muted-foreground">Closing balance</span>
        <span className="ms-auto font-mono font-medium tabular-nums">
          {formatMoney(day.closingBalance, currency)}
        </span>
      </div>
    </div>
  );
}
