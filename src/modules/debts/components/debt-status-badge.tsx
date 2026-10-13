import { IconCircleCheck, IconHeartHandshake, IconHourglass } from "@tabler/icons-react";

import { Badge } from "#/components/ui/badge";

import type { getDebtStatus } from "../utils";

const STATUS_VARIANTS = {
  open: "outline",
  settled: "default",
  forgiven: "secondary",
} as const;

const STATUS_ICONS = {
  open: IconHourglass,
  settled: IconCircleCheck,
  forgiven: IconHeartHandshake,
} as const;

export function DebtStatusBadge({ status }: { status: ReturnType<typeof getDebtStatus> }) {
  const Icon = STATUS_ICONS[status];

  return (
    <Badge variant={STATUS_VARIANTS[status]} className="uppercase">
      <Icon />
      {status}
    </Badge>
  );
}
