import type { DataTableColumnDef } from "#/components/ui/data-table";
import type { getBuckets } from "#/modules/buckets/functions";

import { SortableTableHead } from "#/components/table/sortable-table-head";
import { BucketActivityCell } from "#/modules/buckets/components/bucket-activity-cell";
import { BucketSubtotalCell } from "#/modules/buckets/components/bucket-subtotal-cell";
import { BucketActionsDropdownMenu } from "#/modules/buckets/components/buckets-actions-dropdown-menu";
import { BucketGoalRingCell } from "#/modules/goals/components/bucket-goal-ring-cell";

export const INDEX_COLUMNS: DataTableColumnDef<Awaited<ReturnType<typeof getBuckets>>[number]>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableTableHead column={column}>Name</SortableTableHead>,
    cell: ({ row }) => (
      <span className="block max-w-[20ch] font-semibold wrap-break-word whitespace-normal">
        {row.original.name}
      </span>
    ),
  },
  {
    accessorKey: "subtotal",
    header: () => <div data-currency>Subtotal</div>,
    cell: ({ row }) => (
      <BucketSubtotalCell
        subtotals={row.original.subtotals}
        accountCount={row.original.accountCount}
      />
    ),
  },
  {
    id: "goal",
    accessorFn: ({ goal }) => (goal ? goal.progress / goal.targetAmount : undefined),
    sortUndefined: "last",
    header: ({ column }) => (
      <SortableTableHead column={column} data-currency>
        Goal
      </SortableTableHead>
    ),
    cell: ({ row }) => <BucketGoalRingCell goal={row.original.goal} />,
  },
  {
    id: "activity",
    accessorFn: (bucket) => bucket.lastMovedDate ?? bucket.createdAt,
    header: ({ column }) => <SortableTableHead column={column}>Activity</SortableTableHead>,
    cell: ({ row }) => (
      <BucketActivityCell
        createdAt={row.original.createdAt}
        lastMovedDate={row.original.lastMovedDate}
        allocationCount={row.original.allocationCount}
        withdrawalCount={row.original.withdrawalCount}
      />
    ),
  },
  {
    accessorKey: "actions",
    header: "",
    cell: ({ row }) => <BucketActionsDropdownMenu bucket={row.original} />,
  },
];
