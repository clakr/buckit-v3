import type { ColumnDef } from "@tanstack/react-table";

import { SortableTableHead } from "#/components/table/sortable-table-head";
import { currencyCodec } from "#/lib/codecs";
import { formatCurrency, formatToRelative } from "#/lib/utils";

import type { getBuckets } from "./functions";

import { BucketActionsDropdownMenu } from "./components/buckets-actions-dropdown-menu";

export const columns: ColumnDef<Awaited<ReturnType<typeof getBuckets>>[number]>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableTableHead column={column}>Name</SortableTableHead>,
  },
  {
    accessorKey: "subtotal",
    cell: ({ row }) => {
      const accumulatedPerCurrency = row.original.allocations.reduce<Record<string, number>>(
        (acc, a) => {
          if (!a.bankAccount) return acc;

          if (a.bankAccount.currency in acc) {
            acc[a.bankAccount.currency] += a.amount;
          } else {
            acc[a.bankAccount.currency] = a.amount;
          }

          return acc;
        },
        {},
      );

      const subtotals = Object.entries(accumulatedPerCurrency)
        .map(([currency, value]) =>
          formatCurrency(currencyCodec.encode(value), {
            currency,
          }),
        )
        .join(" + ");

      if (!subtotals) return "-";

      return subtotals;
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <SortableTableHead column={column}>Created Date</SortableTableHead>,
    cell: ({ row }) => formatToRelative(row.original.createdAt),
  },
  {
    accessorKey: "actions",
    header: "",
    cell: ({ row }) => <BucketActionsDropdownMenu bucket={row.original} />,
  },
];
