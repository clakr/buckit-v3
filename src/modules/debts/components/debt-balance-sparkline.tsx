import type { Debt } from "#/db/schema";

import { cn } from "#/lib/utils";

type Props = {
  direction: Debt["direction"];
  amount: Debt["amount"];
  repayments: { amount: number }[];
  formatDebtAmount: (value: number) => string;
};

const WIDTH = 96;
const HEIGHT = 28;
const PADDING = 3;

export function DebtBalanceSparkline({ direction, amount, repayments, formatDebtAmount }: Props) {
  const toneText =
    direction === "receivable"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-amber-600 dark:text-amber-400";

  if (repayments.length === 0) {
    return (
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-7 w-24 text-muted-foreground/60"
        role="img"
        aria-label="No repayments yet"
      >
        <line
          x1={PADDING}
          x2={WIDTH - PADDING}
          y1={PADDING}
          y2={PADDING}
          stroke="currentColor"
          strokeWidth={1.5}
          strokeDasharray="3 3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  let balance = amount;
  const balances = [
    amount,
    ...repayments.map((repayment) => {
      balance -= repayment.amount;

      return Math.max(balance, 0);
    }),
  ];

  const stepWidth = (WIDTH - PADDING * 2) / (balances.length - 1);
  const plotHeight = HEIGHT - PADDING * 2;
  const points = balances.map((value, index) => ({
    x: PADDING + index * stepWidth,
    y: PADDING + (amount === 0 ? plotHeight : (1 - value / amount) * plotHeight),
  }));

  const [first, ...rest] = points;
  const path = rest.reduce(
    (current, point) => `${current} H${point.x} V${point.y}`,
    `M${first.x} ${first.y}`,
  );
  const last = points[points.length - 1];
  const lastBalance = balances[balances.length - 1];

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={cn("h-7 w-24", toneText)}
      role="img"
      aria-label={`Outstanding fell from ${formatDebtAmount(amount)} to ${formatDebtAmount(lastBalance)} over ${repayments.length} repayment${repayments.length === 1 ? "" : "s"}`}
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last.x} cy={last.y} r={2.5} fill="currentColor" />
    </svg>
  );
}
