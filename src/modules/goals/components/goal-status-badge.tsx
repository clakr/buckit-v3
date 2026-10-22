import { IconAlertTriangle, IconCircleCheck, IconHourglass } from "@tabler/icons-react";

import { Badge } from "#/components/ui/badge";

import type { GoalStatus } from "../utils";

const STATUS_VARIANTS = {
  reached: "default",
  overdue: "destructive",
  "in progress": "outline",
} as const;

const STATUS_ICONS = {
  reached: IconCircleCheck,
  overdue: IconAlertTriangle,
  "in progress": IconHourglass,
} as const;

export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  const Icon = STATUS_ICONS[status];

  return (
    <Badge variant={STATUS_VARIANTS[status]} className="uppercase">
      <Icon />
      {status}
    </Badge>
  );
}
