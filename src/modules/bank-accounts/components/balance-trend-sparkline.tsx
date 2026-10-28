import type { BankAccount } from "#/db/schema";
import type { BalanceTrend } from "#/modules/bank-accounts/utils";

import { formatMoney } from "#/lib/money";
import { cn } from "#/lib/utils";
import { getNetChangeTone } from "#/modules/bank-accounts/components/net-change-cell";
import { BALANCE_TREND_DAYS } from "#/modules/bank-accounts/utils";

type Props = {
  trend: BalanceTrend;
  currency: BankAccount["currency"];
};

const WIDTH = 96;
const HEIGHT = 28;
const PADDING = 3;

function buildStepPath(
  { openingBalance, closingBalances }: BalanceTrend,
  getX: (day: number) => number,
  getY: (value: number) => number,
) {
  let path = `M${getX(0)} ${getY(openingBalance)}`;
  let previousBalance = openingBalance;
  for (const [index, balance] of closingBalances.entries()) {
    if (balance !== previousBalance) path += ` H${getX(index + 1)} V${getY(balance)}`;
    previousBalance = balance;
  }

  return `${path} H${getX(BALANCE_TREND_DAYS)}`;
}

export function BalanceTrendSparkline({ trend, currency }: Props) {
  const { openingBalance, closingBalances, net, hasActivity } = trend;
  const closingBalance = closingBalances[BALANCE_TREND_DAYS - 1];
  const stepWidth = (WIDTH - PADDING * 2) / BALANCE_TREND_DAYS;
  const getX = (day: number) => PADDING + day * stepWidth;
  const middle = HEIGHT / 2;

  if (!hasActivity) {
    return (
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-7 w-24 text-muted-foreground/60"
        role="img"
        aria-label="No activity"
      >
        <line
          x1={PADDING}
          x2={WIDTH - PADDING}
          y1={middle}
          y2={middle}
          stroke="currentColor"
          strokeWidth={1.5}
          strokeDasharray="3 3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const min = Math.min(openingBalance, ...closingBalances);
  const max = Math.max(openingBalance, ...closingBalances);
  const plotHeight = HEIGHT - PADDING * 2;
  const getY = (value: number) =>
    max === min ? middle : PADDING + (1 - (value - min) / (max - min)) * plotHeight;

  const path = buildStepPath(trend, getX, getY);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={cn("h-7 w-24", getNetChangeTone(net))}
      role="img"
      aria-label={`Balance moved from ${formatMoney(openingBalance, currency)} to ${formatMoney(closingBalance, currency)} over ${BALANCE_TREND_DAYS} days`}
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={getX(BALANCE_TREND_DAYS)} cy={getY(closingBalance)} r={2.5} fill="currentColor" />
    </svg>
  );
}
