import { Link } from "@tanstack/react-router";

import type { DataTableColumnDef } from "#/components/ui/data-table";
import type { BankAccount } from "#/db/schema";
import type { getBuckets } from "#/modules/buckets/functions";

import { SortableTableHead } from "#/components/table/sortable-table-head";
import { BucketActivityCell } from "#/modules/buckets/components/bucket-activity-cell";
import { BucketSubtotalCell } from "#/modules/buckets/components/bucket-subtotal-cell";
import { BucketActionsDropdownMenu } from "#/modules/buckets/components/buckets-actions-dropdown-menu";
import { BucketGoalRingCell } from "#/modules/goals/components/bucket-goal-ring-cell";

type BucketRow = Awaited<ReturnType<typeof getBuckets>>[number];

export const BUCKET_SORT_COLUMN_IDS = ["name", "subtotal", "goal", "activity"] as const;

const SUBTOTAL_SORT_DISABLED_REASON = "Filter to one currency to sort by subtotal.";

export function getIndexColumns({
  subtotalSortCurrency,
  selectedCurrencies,
}: {
  subtotalSortCurrency: BankAccount["currency"] | null;
  selectedCurrencies: BankAccount["currency"][];
}): DataTableColumnDef<BucketRow>[] {
  return [
    {
      accessorKey: "name",
      meta: {
        className:
          "max-sm:sticky max-sm:start-0 max-sm:z-10 max-sm:bg-card max-sm:shadow-[inset_-1px_0_0_var(--border)]",
      },
      header: ({ column }) => <SortableTableHead column={column}>Name</SortableTableHead>,
      cell: ({ row }) => (
        <Link
          to="/buckets/$bucketId"
          params={{ bucketId: row.original.id }}
          className="block max-w-[20ch] font-semibold wrap-break-word whitespace-normal underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      id: "subtotal",
      accessorFn: ({ subtotals }) =>
        subtotals.find(({ currency }) => currency === subtotalSortCurrency)?.amount,
      enableSorting: subtotalSortCurrency !== null,
      sortFn: "basic",
      sortUndefined: "last",
      header: ({ column }) => (
        <SortableTableHead
          column={column}
          disabledReason={SUBTOTAL_SORT_DISABLED_REASON}
          data-currency
        >
          Subtotal
        </SortableTableHead>
      ),
      cell: ({ row }) => (
        <BucketSubtotalCell
          subtotals={row.original.subtotals}
          accountCount={row.original.accountCount}
          selectedCurrencies={selectedCurrencies}
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
      meta: { className: "max-lg:hidden" },
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
}
