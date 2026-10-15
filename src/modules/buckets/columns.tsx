import type { ColumnDef } from "@tanstack/react-table";

import { IconCircleDottedLetterH } from "@tabler/icons-react";

import type { getBuckets } from "#/modules/buckets/functions";

import { SortableTableHead } from "#/components/table/sortable-table-head";
import { Badge } from "#/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { currencyCodec } from "#/lib/codecs";
import { formatCurrency, formatDateTime, formatToRelative } from "#/lib/utils";
import { BucketActionsDropdownMenu } from "#/modules/buckets/components/buckets-actions-dropdown-menu";

export const INDEX_COLUMNS: ColumnDef<Awaited<ReturnType<typeof getBuckets>>[number]>[] = [
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
        .map(({ currency, amount }) =>
          formatCurrency(currencyCodec.encode(amount), {
            currency,
          }),
        )
        .join(" + ");

      if (!subtotals) return "-";

      return <span className="block text-end font-semibold tabular-nums">{subtotals}</span>;
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
