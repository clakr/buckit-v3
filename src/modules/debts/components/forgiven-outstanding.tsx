import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { useState } from "react";

import type { Debt } from "#/db/schema";

import { Button } from "#/components/ui/button";

type Props = {
  amount: Debt["amount"];
  outstanding: number;
  formatDebtAmount: (value: number) => string;
};

export function ForgivenOutstanding({ amount, outstanding, formatDebtAmount }: Props) {
  const [isShown, setIsShown] = useState(false);
  const Icon = isShown ? IconEyeOff : IconEye;

  const forgiven = Math.max(outstanding, 0);
  const repaidWidth = amount === 0 ? 0 : ((amount - forgiven) / amount) * 100;

  return (
    <div className="ms-auto flex w-40 flex-col items-end gap-y-1">
      <div className="flex items-center gap-x-1 font-semibold text-muted-foreground">
        <Button
          variant="ghost"
          size="icon"
          className="size-5 text-muted-foreground"
          aria-label={isShown ? "Hide forgiven amount" : "Show forgiven amount"}
          aria-pressed={isShown}
          onClick={() => setIsShown((value) => !value)}
        >
          <Icon className="size-3.5" />
        </Button>
        <span className="uppercase">Forgiven</span>
        {isShown ? <span className="tabular-nums line-through">{formatDebtAmount(forgiven)}</span> : null}
      </div>

      {isShown ? (
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-foreground/60" style={{ width: `${repaidWidth}%` }} />
          <div className="h-full flex-1 border-l-2 border-background bg-[repeating-linear-gradient(135deg,var(--muted-foreground)_0_1px,transparent_1px_4px)] opacity-50" />
        </div>
      ) : null}
    </div>
  );
}
