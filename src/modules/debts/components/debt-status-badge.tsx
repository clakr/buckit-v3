import { Badge } from "#/components/ui/badge";

import type { getDebtStatus } from "../utils";

const STATUS_VARIANTS = {
  open: "outline",
  settled: "default",
  forgiven: "secondary",
} as const;

export function DebtStatusBadge({ status }: { status: ReturnType<typeof getDebtStatus> }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]} className="capitalize">
      {status}
    </Badge>
  );
}
