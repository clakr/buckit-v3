import { IconArrowDownLeft, IconArrowUpRight } from "@tabler/icons-react";

import type { Debt } from "#/db/schema";

import { Badge } from "#/components/ui/badge";

export function DebtDirectionBadge({ direction }: { direction: Debt["direction"] }) {
  const Icon = direction === "receivable" ? IconArrowDownLeft : IconArrowUpRight;

  return (
    <Badge variant={direction === "receivable" ? "default" : "secondary"} className="uppercase">
      <Icon />
      {direction}
    </Badge>
  );
}
