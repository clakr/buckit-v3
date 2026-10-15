import type { ColumnDef } from "@tanstack/react-table";

import { IconCircleDottedLetterH } from "@tabler/icons-react";

import type { getAllocations } from "#/modules/allocations/functions";

import { SortableTableHead } from "#/components/table/sortable-table-head";
import { Badge } from "#/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { currencyCodec } from "#/lib/codecs";
import { formatCurrency, formatDateTime, formatToRelative } from "#/lib/utils";
import { AllocationActionsDropdownMenu } from "#/modules/allocations/components/allocation-actions-dropdown-menu";

type AllocationRow = Awaited<ReturnType<typeof getAllocations>>[number];

const ALLOCATION_COLUMNS: ColumnDef<AllocationRow>[] = [
  {
    accessorKey: "date",
    header: ({ column }) => <SortableTableHead column={column}>Date</SortableTableHead>,
    cell: ({ row }) => (
      <Tooltip>
        <TooltipTrigger render={<Badge variant="secondary" className="capitalize" />}>
          <IconCircleDottedLetterH />
          {formatToRelative(row.original.date)}
        </TooltipTrigger>
        <TooltipContent>{formatDateTime(row.original.date)}</TooltipContent>
      </Tooltip>
    ),
  },
  {
    id: "bucket",
    accessorKey: "bucket.name",
    header: "Bucket",
    cell: ({ row }) => <span className="font-semibold">{row.original.bucket?.name}</span>,
  },
  {
    id: "bankAccount",
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
    header: () => <div data-currency>Amount</div>,
    cell: ({ row }) => (
      <span className="block text-end font-semibold tabular-nums">
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

/** The Allocation table's columns, leaving out the parent the page already shows. */
export function getAllocationColumns({ omit }: { omit?: "bucket" | "bankAccount" } = {}) {
  return ALLOCATION_COLUMNS.filter((column) => column.id !== omit);
}
