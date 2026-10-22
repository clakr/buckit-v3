import { IconCircleDottedLetterH } from "@tabler/icons-react";

import type { DataTableColumnDef } from "#/components/ui/data-table";
import type { getBuckets } from "#/modules/buckets/functions";

import { SortableTableHead } from "#/components/table/sortable-table-head";
import { Badge } from "#/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { formatMoney } from "#/lib/money";
import { formatDateTime, formatToRelative } from "#/lib/utils";
import { BucketActionsDropdownMenu } from "#/modules/buckets/components/buckets-actions-dropdown-menu";
import { GoalStatusBadge } from "#/modules/goals/components/goal-status-badge";
import { getGoalStatus } from "#/modules/goals/utils";

export const INDEX_COLUMNS: DataTableColumnDef<Awaited<ReturnType<typeof getBuckets>>[number]>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableTableHead column={column}>Name</SortableTableHead>,
    cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
  },
  {
    accessorKey: "subtotal",
    header: () => <div data-currency>Subtotal</div>,
    cell: ({ row }) => {
      const subtotals = row.original.subtotals
        .map(({ currency, amount }) => formatMoney(amount, currency))
        .join(" + ");

      if (!subtotals) return "-";

      return <span className="block text-end font-semibold tabular-nums">{subtotals}</span>;
    },
  },
  {
    accessorKey: "goal",
    header: "Goal",
    cell: ({ row }) => {
      const { goal } = row.original;

      if (!goal) return null;

      const percent = Math.max(Math.floor((goal.progress / goal.targetAmount) * 100), 0);
      const barPercent = Math.min(percent, 100);

      return (
        <div className="flex min-w-48 flex-col gap-y-1.5">
          <div className="flex items-center justify-between gap-x-4">
            <GoalStatusBadge status={getGoalStatus(goal)} />
            <span className="text-muted-foreground tabular-nums">
              {percent}% of {formatMoney(goal.targetAmount, goal.currency)}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={`${row.original.name} Goal progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={barPercent}
            className="h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full bg-foreground/60" style={{ width: `${barPercent}%` }} />
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <SortableTableHead column={column}>Created Date</SortableTableHead>,
    cell: ({ row }) => (
      <Tooltip>
        <TooltipTrigger render={<Badge variant="secondary" className="capitalize" />}>
          <IconCircleDottedLetterH />
          {formatToRelative(row.original.createdAt)}
        </TooltipTrigger>
        <TooltipContent>{formatDateTime(row.original.createdAt)}</TooltipContent>
      </Tooltip>
    ),
  },
  {
    accessorKey: "actions",
    header: "",
    cell: ({ row }) => <BucketActionsDropdownMenu bucket={row.original} />,
  },
];
