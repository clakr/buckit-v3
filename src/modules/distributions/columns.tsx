import type { DataTableColumnDef } from "#/components/ui/data-table";
import type { SavedDistribution } from "#/modules/distributions/functions";

import { SortableTableHead } from "#/components/table/sortable-table-head";
import { formatMoney } from "#/lib/money";
import { DistributionActionsDropdownMenu } from "#/modules/distributions/components/distribution-actions-dropdown-menu";
import { DistributionSplitCell } from "#/modules/distributions/components/distribution-split-cell";
import { TriggerDistributionButton } from "#/modules/distributions/components/trigger-distribution-button";
import { computeDistributionPlan, savedLinesToPlanLines } from "#/modules/distributions/utils";

export const INDEX_COLUMNS: DataTableColumnDef<SavedDistribution>[] = [
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
    id: "bankAccount",
    accessorFn: ({ bankAccount }) => bankAccount.name,
    header: ({ column }) => <SortableTableHead column={column}>Bank Account</SortableTableHead>,
    cell: ({ row }) => (
      <div className="flex max-w-[20ch] flex-col">
        <span className="wrap-break-word whitespace-normal">{row.original.bankAccount.name}</span>
        <span className="text-xs text-muted-foreground">{row.original.bankAccount.currency}</span>
      </div>
    ),
  },
  {
    accessorKey: "amount",
    // Not sortable: each row is in its own Bank Account's currency, so cents don't compare.
    header: () => <div data-currency>Default Amount</div>,
    cell: ({ row }) => (
      <span className="block text-end tabular-nums">
        {formatMoney(row.original.amount, row.original.bankAccount.currency)}
      </span>
    ),
  },
  {
    id: "split",
    header: "Split",
    cell: ({ row }) => <DistributionSplitCell distribution={row.original} />,
  },
  {
    id: "unallocated",
    header: () => <div data-currency>Left Unallocated</div>,
    cell: ({ row }) => {
      const { remainingCents } = computeDistributionPlan(
        savedLinesToPlanLines(row.original.lines),
        row.original.amount,
      );

      return (
        <span className="block text-end tabular-nums">
          {formatMoney(remainingCents, row.original.bankAccount.currency)}
        </span>
      );
    },
  },
  {
    accessorKey: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-x-1">
        <TriggerDistributionButton distribution={row.original} />
        <DistributionActionsDropdownMenu distribution={row.original} />
      </div>
    ),
  },
];
