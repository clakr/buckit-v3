import { format } from "date-fns";
import { useId } from "react";
import { Area, AreaChart, ReferenceDot, ReferenceLine, XAxis, YAxis } from "recharts";

import { ChartContainer } from "#/components/ui/chart";
import { cn } from "#/lib/utils";

import type { GoalProgressPoint } from "../history.server";

type Props = {
  history: GoalProgressPoint[];
  startedAt: Date;
  progress: number;
  targetAmount: number;
  className?: string;
};

/** The Bucket's balance in the Goal's currency over time, against the target as a dashed line. */
export function GoalProgressChart({
  history,
  startedAt,
  progress,
  targetAmount,
  className,
}: Props) {
  const gradientId = `goal-progress-${useId().replace(/:/g, "")}`;

  const start = history[0]?.date ?? startedAt.getTime();
  const end = Math.max(Date.now(), history.at(-1)?.date ?? 0);
  const data = [
    { date: start, progress: 0 },
    ...history,
    { date: end, progress: Math.max(progress, 0) },
  ];
  const ceiling = Math.max(targetAmount, ...data.map((point) => point.progress));

  return (
    <div className={cn("flex flex-col gap-y-1", className)}>
      <ChartContainer config={{}} className="aspect-auto h-24 w-full">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity={0.25} />
              <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis hide type="number" dataKey="date" domain={[start, end]} />
          <YAxis hide domain={[0, ceiling]} />
          <ReferenceLine
            y={targetAmount}
            stroke="currentColor"
            strokeOpacity={0.3}
            strokeDasharray="3 3"
          />
          <Area
            dataKey="progress"
            type="stepAfter"
            stroke="currentColor"
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
          />
          <ReferenceDot x={end} y={Math.max(progress, 0)} r={4} fill="currentColor" stroke="none" />
        </AreaChart>
      </ChartContainer>
      <div className="flex justify-between text-muted-foreground">
        <span>{format(start, "MMM d")}</span>
        <span>Today</span>
      </div>
    </div>
  );
}
