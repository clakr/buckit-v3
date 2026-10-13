import type { ColumnDef } from "@tanstack/react-table";

import { IconCircleDashed, IconCircleDottedLetterH } from "@tabler/icons-react";

import { SortableTableHead } from "#/components/table/sortable-table-head";
import { Badge } from "#/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { currencyCodec } from "#/lib/codecs";
import { formatCurrency, formatDateTime, formatToRelative } from "#/lib/utils";
import { getRepaymentDate } from "#/modules/repayments/utils";

import type { getDebts } from "./functions";

import { DebtActionsDropdownMenu } from "./components/debt-actions-dropdown-menu";
import { DebtDirectionBadge } from "./components/debt-direction-badge";
import { DebtOutstandingMeter } from "./components/debt-outstanding-meter";
import { DebtStatusBadge } from "./components/debt-status-badge";
import { getDebtOutstanding, getDebtStatus } from "./utils";

export const INDEX_COLUMNS: ColumnDef<Awaited<ReturnType<typeof getDebts>>[number]>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableTableHead column={column}>Name</SortableTableHead>,
    cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
  },
  {
    accessorKey: "direction",
    cell: ({ row }) => <DebtDirectionBadge direction={row.original.direction} />,
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <DebtStatusBadge status={getDebtStatus(row.original)} />,
  },
  {
    accessorKey: "outstanding",
    header: () => <div data-currency>Outstanding</div>,
    cell: ({ row }) => (
      <DebtOutstandingMeter
        direction={row.original.direction}
        amount={row.original.amount}
        outstanding={getDebtOutstanding(row.original)}
        repaymentsCount={row.original.repayments.length}
        formatDebtAmount={(value) =>
          formatCurrency(currencyCodec.encode(value), { currency: row.original.currency })
        }
      />
    ),
  },
  {
    accessorKey: "lastRepaymentDate",
    header: ({ column }) => (
      <SortableTableHead column={column}>Last Repayment Date</SortableTableHead>
    ),
    cell: ({ row }) => {
      const lastRepayment = row.original.repayments[0];
      const lastRepaymentDate = lastRepayment ? getRepaymentDate(lastRepayment) : undefined;

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
