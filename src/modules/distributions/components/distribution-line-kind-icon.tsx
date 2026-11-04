import { IconArrowDownLeft, IconArrowUpRight } from "@tabler/icons-react";

import type { DistributionLineKind } from "#/modules/distributions/utils";

import { MODULE_ICONS } from "#/lib/constants";
import { cn } from "#/lib/utils";

const LINE_KIND_ICONS = {
  bucket: { icon: MODULE_ICONS.buckets, className: "text-primary", label: "Bucket" },
  receivable: {
    icon: IconArrowDownLeft,
    className: "text-emerald-600 dark:text-emerald-400",
    label: "Owes you",
  },
  payable: {
    icon: IconArrowUpRight,
    className: "text-amber-600 dark:text-amber-400",
    label: "You owe",
  },
} satisfies Record<DistributionLineKind, unknown>;

export function DistributionLineKindIcon({
  kind,
  className,
}: {
  kind: DistributionLineKind;
  className?: string;
}) {
  const { icon: Icon, className: kindClassName, label } = LINE_KIND_ICONS[kind];

  return (
    <>
      <Icon aria-hidden className={cn("size-3 shrink-0", kindClassName, className)} />
      <span className="sr-only">{label}:</span>
    </>
  );
}
