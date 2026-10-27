import { cn } from "#/lib/utils";

type Props = {
  percent: number;
  label: string;
  className?: string;
};

const RING_SIZE = 40;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function ProgressRing({ percent, label, className }: Props) {
  const fill = Math.min(percent, 100);

  return (
    <div className={cn("relative size-10 shrink-0", className)}>
      <svg
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="size-full -rotate-90"
        role="img"
        aria-label={label}
      >
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={RING_STROKE}
          className="stroke-muted"
        />
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - fill / 100)}
        />
      </svg>
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-foreground tabular-nums"
      >
        {percent > 999 ? "999+" : `${percent}%`}
      </span>
    </div>
  );
}
