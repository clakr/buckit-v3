import type { ColumnDef } from "@tanstack/react-table";

import { IconCircleDottedLetterH } from "@tabler/icons-react";

import type { getWithdrawals } from "#/modules/withdrawals/functions";

import { SortableTableHead } from "#/components/table/sortable-table-head";
import { Badge } from "#/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { formatMoney } from "#/lib/money";
import { formatDateTime, formatToRelative } from "#/lib/utils";

type WithdrawalRow = Awaited<ReturnType<typeof getWithdrawals>>[number];

export const WITHDRAWAL_COLUMNS: ColumnDef<WithdrawalRow>[] = [
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
        {row.original.bankAccount
          ? formatMoney(row.original.amount, row.original.bankAccount.currency)
          : "—"}
      </span>
    ),
  },
  {
    accessorKey: "note",
  },
];
