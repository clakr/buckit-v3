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

export function BalanceTrendSparkline({ trend, currency }: Props) {
  const { series, net, hasActivity } = trend;
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

  const min = Math.min(...series);
  const max = Math.max(...series);
  const plotHeight = HEIGHT - PADDING * 2;
  const getY = (value: number) =>
    max === min ? middle : PADDING + (1 - (value - min) / (max - min)) * plotHeight;

  // A balance holds until the next Transaction, so draw steps instead of slopes.
  let path = `M${getX(0)} ${getY(series[0])}`;
  for (let day = 1; day <= BALANCE_TREND_DAYS; day++) {
    if (series[day] !== series[day - 1]) path += ` H${getX(day)} V${getY(series[day])}`;
  }
  path += ` H${getX(BALANCE_TREND_DAYS)}`;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={cn("h-7 w-24", getNetChangeTone(net))}
      role="img"
      aria-label={`Balance moved from ${formatMoney(series[0], currency)} to ${formatMoney(series[BALANCE_TREND_DAYS], currency)} over ${BALANCE_TREND_DAYS} days`}
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={getX(BALANCE_TREND_DAYS)}
        cy={getY(series[BALANCE_TREND_DAYS])}
        r={2.5}
        fill="currentColor"
      />
    </svg>
  );
}
