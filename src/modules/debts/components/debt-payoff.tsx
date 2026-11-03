import { IconHeartHandshake } from "@tabler/icons-react";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";

import type { getDebt } from "#/modules/debts/functions";

import { Stat } from "#/components/stat";
import { ChartContainer, ChartTooltip, type ChartConfig } from "#/components/ui/chart";
import { formatMoney } from "#/lib/money";
import { cn, formatDate } from "#/lib/utils";

type DebtDetail = Awaited<ReturnType<typeof getDebt>>;

type Props = {
  debt: DebtDetail;
};

type PayoffPoint = { date: number; outstanding: number };

const MIN_REPAYMENTS_FOR_PACE = 2;

const RECEIVABLE_TEXT = "text-emerald-600 dark:text-emerald-400";
const PAYABLE_TEXT = "text-amber-600 dark:text-amber-400";

function getPayoffPoints(debt: DebtDetail, today: Date): PayoffPoint[] {
  let outstanding = debt.amount;
  const points: PayoffPoint[] = [{ date: debt.date.getTime(), outstanding }];

  for (const repayment of debt.repayments) {
    outstanding -= repayment.amount;
    points.push({ date: repayment.date.getTime(), outstanding: Math.max(outstanding, 0) });
  }

  const lastPoint = points.at(-1);
  const endDate = debt.forgivenAt ?? (debt.status === "open" ? today : null);
  if (lastPoint && endDate && endDate.getTime() > lastPoint.date)
    points.push({ date: endDate.getTime(), outstanding: lastPoint.outstanding });

  return points;
}

function getProjectedPayoffDate(debt: DebtDetail, today: Date) {
  if (debt.status !== "open" || debt.repayments.length < MIN_REPAYMENTS_FOR_PACE) return null;

  const daysSinceRecorded = differenceInCalendarDays(today, debt.date);
  if (daysSinceRecorded < 1) return null;

  const repaidPerDay = debt.repaid / daysSinceRecorded;

  return addDays(today, Math.ceil(debt.outstanding / repaidPerDay));
}

function formatDaysAfterRecorded(days: number) {
  if (days <= 0) return "The day it was recorded";

  return `${days} ${days === 1 ? "day" : "days"} after it was recorded`;
}

export function DebtPayoff({ debt }: Props) {
  const today = new Date();
  const { currency, amount, repaid, outstanding, status, repayments } = debt;
  const isReceivable = debt.direction === "receivable";
  const repaymentCount = repayments.length;

  function formatDebtAmount(value: number) {
    return formatMoney(value, currency);
  }

  const percentRepaid = amount === 0 ? 0 : Math.floor((Math.min(repaid, amount) / amount) * 100);
  const lastRepaymentDate = debt.lastRepaymentDate;
  const averageGapDays =
    lastRepaymentDate && repaymentCount >= MIN_REPAYMENTS_FOR_PACE
      ? Math.max(
          Math.round(differenceInCalendarDays(lastRepaymentDate, debt.date) / repaymentCount),
          1,
        )
      : null;
  const projectedPayoffDate = getProjectedPayoffDate(debt, today);
  const payoffPoints = getPayoffPoints(debt, today);

  return (
    <section aria-label="Payoff" className="flex flex-col gap-y-4 border-b p-4">
      {debt.forgivenAt ? (
        <p className="flex items-center gap-x-2 rounded-md border border-dashed bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <IconHeartHandshake aria-hidden className="size-4 shrink-0" />
          <span>
            Forgiven on {formatDate(debt.forgivenAt)}.{" "}
            {outstanding > 0
              ? `${formatDebtAmount(outstanding)} was written off.`
              : "Nothing was left to write off."}
          </span>
        </p>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:flex-wrap sm:gap-x-10">
        <OutstandingStat debt={debt} formatDebtAmount={formatDebtAmount} />
        <Stat label="Repaid" value={formatDebtAmount(repaid)}>
          <dd className="text-xs text-muted-foreground tabular-nums">
            {repaymentCount === 0
              ? "No repayments yet"
              : `${percentRepaid}% across ${repaymentCount} ${repaymentCount === 1 ? "repayment" : "repayments"}`}
          </dd>
        </Stat>
        {averageGapDays !== null ? (
          <Stat
            label="Pace"
            value={`Every ${averageGapDays === 1 ? "day" : `${averageGapDays} days`}`}
          >
            <dd className="text-xs text-muted-foreground tabular-nums">
              {formatDebtAmount(Math.round(repaid / repaymentCount))} on average
            </dd>
          </Stat>
        ) : null}
        {projectedPayoffDate ? (
          <Stat label="Projected payoff" value={format(projectedPayoffDate, "MMM yyyy")}>
            <dd className="text-xs text-muted-foreground">At the pace so far</dd>
          </Stat>
        ) : null}
        {status === "settled" && lastRepaymentDate ? (
          <Stat label="Settled" value={format(lastRepaymentDate, "MMM d, yyyy")}>
            <dd className="text-xs text-muted-foreground">
              {formatDaysAfterRecorded(differenceInCalendarDays(lastRepaymentDate, debt.date))}
            </dd>
          </Stat>
        ) : null}
      </dl>

      <div
        role="progressbar"
        aria-label="Repaid"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentRepaid}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full rounded-full",
            status === "forgiven"
              ? "bg-muted-foreground/40"
              : isReceivable
                ? "bg-emerald-500 dark:bg-emerald-400"
                : "bg-amber-500 dark:bg-amber-400",
          )}
          style={{ width: `${percentRepaid}%` }}
        />
      </div>

      {repaymentCount > 0 && payoffPoints[0].date < (payoffPoints.at(-1)?.date ?? 0) ? (
        <PayoffChart debt={debt} points={payoffPoints} />
      ) : null}
    </section>
  );
}

function OutstandingStat({
  debt,
  formatDebtAmount,
}: {
  debt: DebtDetail;
  formatDebtAmount: (value: number) => string;
}) {
  const { outstanding, amount, status, direction } = debt;

  if (status === "forgiven")
    return (
      <Stat
        label="Written off"
        value={
          <span className="text-muted-foreground">
            {formatDebtAmount(Math.max(outstanding, 0))}
          </span>
        }
      >
        <dd className="text-xs text-muted-foreground tabular-nums">
          of {formatDebtAmount(amount)}
        </dd>
      </Stat>
    );

  if (outstanding < 0)
    return (
      <Stat
        label="Overpaid"
        value={
          <span className={direction === "receivable" ? RECEIVABLE_TEXT : PAYABLE_TEXT}>
            +{formatDebtAmount(-outstanding)}
          </span>
        }
      >
        <dd className="text-xs text-muted-foreground tabular-nums">
          on {formatDebtAmount(amount)}
        </dd>
      </Stat>
    );

  return (
    <Stat label="Outstanding" value={formatDebtAmount(outstanding)}>
      <dd className="text-xs text-muted-foreground tabular-nums">
        {status === "settled" ? "Paid in full" : `of ${formatDebtAmount(amount)}`}
      </dd>
    </Stat>
  );
}

function PayoffChart({ debt, points }: { debt: DebtDetail; points: PayoffPoint[] }) {
  const isReceivable = debt.direction === "receivable";
  const chartConfig = {
    outstanding: {
      label: "Outstanding",
      color: isReceivable ? "#10b981" : "#f59e0b",
    },
  } satisfies ChartConfig;

  const compactMoneyFormat = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: debt.currency,
    notation: "compact",
  });

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-40 w-full">
      <AreaChart data={points} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`payoff-fill-${debt.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-outstanding)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--color-outstanding)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={(date: number) => format(date, "MMM d")}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={56}
          tickCount={4}
          domain={[0, debt.amount]}
          tickFormatter={(value: number) => compactMoneyFormat.format(value / 100)}
        />
        {debt.forgivenAt ? (
          <ReferenceLine
            x={Math.max(debt.forgivenAt.getTime(), points[0].date)}
            stroke="var(--muted-foreground)"
            strokeDasharray="2 2"
            label={{
              value: "Forgiven",
              position: "insideTopRight",
              fill: "var(--foreground)",
              fontSize: 11,
              dy: -14,
            }}
          />
        ) : null}
        <ChartTooltip
          cursor={{ stroke: "var(--border)" }}
          content={({ active, payload }) => {
            const point = active ? (payload?.[0]?.payload as PayoffPoint | undefined) : undefined;
            if (!point) return null;

            return (
              <div className="grid min-w-36 gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs/relaxed shadow-xl">
                <div className="font-medium">{format(point.date, "MMM d, yyyy")}</div>
                <div className="flex items-center justify-between gap-x-3">
                  <span className="text-muted-foreground">Outstanding</span>
                  <span className="font-medium tabular-nums">
                    {formatMoney(point.outstanding, debt.currency)}
                  </span>
                </div>
              </div>
            );
          }}
        />
        <Area
          dataKey="outstanding"
          type="stepAfter"
          stroke="var(--color-outstanding)"
          strokeWidth={2}
          fill={`url(#payoff-fill-${debt.id})`}
          isAnimationActive={false}
          dot={false}
          activeDot={{ r: 3 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
