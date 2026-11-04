import type { DataTableColumnDef } from "#/components/ui/data-table";
import type { BankAccount } from "#/db/schema";
import type { DistributionRow } from "#/modules/distributions/attention";

import { SortableTableHead } from "#/components/table/sortable-table-head";
import { DistributionActionsDropdownMenu } from "#/modules/distributions/components/distribution-actions-dropdown-menu";
import { DistributionAmountFigures } from "#/modules/distributions/components/distribution-amount-figures";
import { DistributionNameCell } from "#/modules/distributions/components/distribution-name-cell";
import { DistributionRecipeCell } from "#/modules/distributions/components/distribution-recipe-cell";
import { TriggerDistributionButton } from "#/modules/distributions/components/trigger-distribution-button";

export const DISTRIBUTION_SORT_COLUMN_IDS = ["name", "amount"] as const;

const AMOUNT_SORT_DISABLED_REASON = "Filter to one currency to sort by default amount.";

export function getIndexColumns({
  amountSortCurrency,
}: {
  amountSortCurrency: BankAccount["currency"] | null;
}): DataTableColumnDef<DistributionRow>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <SortableTableHead column={column}>Name</SortableTableHead>,
      cell: ({ row }) => <DistributionNameCell distribution={row.original} />,
    },
    {
      id: "amount",
      meta: { className: "max-sm:hidden" },
      accessorFn: ({ amount, bankAccount }) =>
        bankAccount.currency === amountSortCurrency ? amount : undefined,
      enableSorting: amountSortCurrency !== null,
      sortFn: "basic",
      sortUndefined: "last",
      header: ({ column }) => (
        <SortableTableHead
          column={column}
          disabledReason={AMOUNT_SORT_DISABLED_REASON}
          data-currency
        >
          Default Amount
        </SortableTableHead>
      ),
      cell: ({ row }) => {
        return (
          <div className="flex flex-col items-end text-end">
            <DistributionAmountFigures distribution={row.original} />
          </div>
        );
      },
    },
    {
      id: "split",
      meta: { className: "max-sm:hidden" },
      header: "Where It Goes",
      cell: ({ row }) => <DistributionRecipeCell distribution={row.original} />,
    },
    {
      accessorKey: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1 max-sm:flex-col">
          <TriggerDistributionButton distribution={row.original} />
          <DistributionActionsDropdownMenu distribution={row.original} />
        </div>
      ),
    },
  ];
}
