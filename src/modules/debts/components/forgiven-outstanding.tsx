import { IconHeartHandshake } from "@tabler/icons-react";

type Props = {
  outstanding: number;
  formatDebtAmount: (value: number) => string;
};

export function ForgivenOutstanding({ outstanding, formatDebtAmount }: Props) {
  return (
    <div className="ms-auto flex min-w-40 items-center justify-end gap-x-3">
      <div className="flex flex-col items-end">
        <span className="font-semibold text-muted-foreground uppercase">Forgiven</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatDebtAmount(Math.max(outstanding, 0))} written off
        </span>
      </div>

      <div
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-full border-4 border-dashed border-muted text-muted-foreground"
      >
        <IconHeartHandshake className="size-4" />
      </div>
    </div>
  );
}
