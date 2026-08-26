import type { ColumnDef } from "@tanstack/react-table";

import { IconCircleDottedLetterH } from "@tabler/icons-react";

import type { Allocation } from "#/db/schema";
import type { getBucket, getBuckets } from "#/modules/buckets/functions";

import { SortableTableHead } from "#/components/table/sortable-table-head";
import { Badge } from "#/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { currencyCodec } from "#/lib/codecs";
import { formatCurrency, formatDateTime, formatToRelative } from "#/lib/utils";
import { AllocationActionsDropdownMenu } from "#/modules/allocations/components/allocation-actions-dropdown-menu";
import { BucketActionsDropdownMenu } from "#/modules/buckets/components/buckets-actions-dropdown-menu";

export const INDEX_COLUMNS: ColumnDef<Awaited<ReturnType<typeof getBuckets>>[number]>[] = [
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

      return <span className="font-medium">{subtotals}</span>;
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
    cell: ({ row }) => <BucketActionsDropdownMenu bucketId={row.original.id} />,
  },
];

export const ALLOCATIONS_COLUMNS: ColumnDef<
  NonNullable<Awaited<ReturnType<typeof getBucket>>>["allocations"][number]
>[] = [
  {
    accessorKey: "date",
    header: ({ column }) => <SortableTableHead column={column}>Date</SortableTableHead>,
    cell: ({ getValue }) => {
      const date = getValue<Allocation["date"]>();

      return (
        <Tooltip>
          <TooltipTrigger render={<Badge variant="secondary" className="capitalize" />}>
            <IconCircleDottedLetterH />
            {formatToRelative(date)}
          </TooltipTrigger>
          <TooltipContent>{formatDateTime(date)}</TooltipContent>
        </Tooltip>
      );
    },
  },
  {
    accessorKey: "bankAccount.name",
    header: "Bank Account",
    cell: ({ row }) => (
      <span className="flex items-center gap-x-2 font-semibold">
        {row.original.bankAccount?.name}
        <Badge>{row.original.bankAccount?.currency}</Badge>
      </span>
    ),
  },
  {
    accessorKey: "amount",
    cell: ({ row }) => (
      <span className="font-medium">
        {formatCurrency(currencyCodec.encode(row.original.amount), {
          currency: row.original.bankAccount?.currency,
        })}
      </span>
    ),
  },
  {
    accessorKey: "note",
  },
  {
    accessorKey: "actions",
    header: "",
    cell: ({ row }) => <AllocationActionsDropdownMenu allocationId={row.original.id} />,
  },
];
