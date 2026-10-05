import type { ColumnDef } from "@tanstack/react-table";

import { IconCircleDashed, IconCircleDottedLetterH } from "@tabler/icons-react";

import { SortableTableHead } from "#/components/table/sortable-table-head";
import { Badge } from "#/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { currencyCodec } from "#/lib/codecs";
import { formatCurrency, formatDateTime, formatToRelative } from "#/lib/utils";

import type { getDebts } from "./functions";

import { DebtActionsDropdownMenu } from "./components/debt-actions-dropdown-menu";
import { getDebtOutstanding } from "./utils";

export const INDEX_COLUMNS: ColumnDef<Awaited<ReturnType<typeof getDebts>>[number]>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableTableHead column={column}>Name</SortableTableHead>,
  },
  {
    accessorKey: "direction",
    cell: ({ row }) => {
      const direction = row.original.direction;

      return (
        <Badge
          variant={direction === "receivable" ? "default" : "secondary"}
          className="capitalize"
        >
          {direction}
        </Badge>
      );
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <SortableTableHead column={column} data-currency>
        Amount
      </SortableTableHead>
    ),
    cell: ({ row }) => {
      const value = formatCurrency(currencyCodec.encode(row.original.amount), {
        currency: row.original.currency,
      });

      return <span className="block text-end font-medium">{value}</span>;
    },
  },
  {
    accessorKey: "outstanding",
    header: ({ column }) => (
      <SortableTableHead column={column} data-currency>
        Outstanding
      </SortableTableHead>
    ),
    cell: ({ row }) => {
      const outstanding = getDebtOutstanding({
        amount: row.original.amount,
        repayments: row.original.repayments,
      });

      const value = formatCurrency(currencyCodec.encode(outstanding), {
        currency: row.original.currency,
      });

      return <span className="block text-end font-medium">{value}</span>;
    },
  },
  {
    accessorKey: "lastRepaymentDate",
    header: ({ column }) => (
      <SortableTableHead column={column}>Last Repayment Date</SortableTableHead>
    ),
    cell: ({ row }) => {
      const lastRepaymentDate = row.original.repayments[0]?.transaction?.date;

      if (!lastRepaymentDate) {
        return (
          <Badge variant="secondary" className="uppercase">
            <IconCircleDashed />
            No Repayments
          </Badge>
        );
      }

      return (
        <Tooltip>
          <TooltipTrigger render={<Badge variant="secondary" className="capitalize" />}>
            <IconCircleDottedLetterH />
            {formatToRelative(lastRepaymentDate)}
          </TooltipTrigger>
          <TooltipContent>{formatDateTime(lastRepaymentDate)}</TooltipContent>
        </Tooltip>
      );
    },
  },
  {
    accessorKey: "actions",
    header: "",
    cell: ({ row }) => <DebtActionsDropdownMenu debt={row.original} />,
  },
];
