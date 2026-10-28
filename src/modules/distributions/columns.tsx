import type { DataTableColumnDef } from "#/components/ui/data-table";
import type { getDistributions } from "#/modules/distributions/functions";

import { SortableTableHead } from "#/components/table/sortable-table-head";
import { formatMoney } from "#/lib/money";

type DistributionRow = Awaited<ReturnType<typeof getDistributions>>[number];

function formatLine(line: DistributionRow["lines"][number], currency: string) {
  const value =
    line.basisPoints === null
      ? formatMoney(line.amount ?? 0, currency)
      : `${line.basisPoints / 100}%`;

  return `${line.bucketName} ${value}`;
}

export const INDEX_COLUMNS: DataTableColumnDef<DistributionRow>[] = [
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
      <span className="block max-w-[20ch] wrap-break-word whitespace-normal">
        {row.original.bankAccount.name}
      </span>
    ),
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <SortableTableHead column={column} data-currency>
        Default Amount
      </SortableTableHead>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatMoney(row.original.amount, row.original.bankAccount.currency)}
      </span>
    ),
  },
  {
    id: "lines",
    header: "Lines",
    cell: ({ row }) => (
      <span className="block max-w-[32ch] wrap-break-word whitespace-normal text-muted-foreground">
        {row.original.lines
          .map((line) => formatLine(line, row.original.bankAccount.currency))
          .join(", ")}
      </span>
    ),
  },
];
