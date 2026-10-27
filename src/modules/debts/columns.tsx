import { IconCircleDashed, IconCircleDottedLetterH } from "@tabler/icons-react";

import type { DataTableColumnDef } from "#/components/ui/data-table";

import { SortableTableHead } from "#/components/table/sortable-table-head";
import { Badge } from "#/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { formatMoney } from "#/lib/money";
import { formatDateTime, formatToRelative } from "#/lib/utils";

import type { getDebts } from "./functions";

import { DebtActionsDropdownMenu } from "./components/debt-actions-dropdown-menu";
import { DebtBalanceSparkline } from "./components/debt-balance-sparkline";
import { DebtDirectionBadge } from "./components/debt-direction-badge";
import { DebtProgressRing } from "./components/debt-progress-ring";
import { ForgivenOutstanding } from "./components/forgiven-outstanding";

export const INDEX_COLUMNS: DataTableColumnDef<Awaited<ReturnType<typeof getDebts>>[number]>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableTableHead column={column}>Name</SortableTableHead>,
    cell: ({ row }) => {
      const { name, note } = row.original;

      return (
        <div className="flex max-w-64 flex-col">
          <span className="font-semibold">{name}</span>
          {note ? (
            <Tooltip>
              <TooltipTrigger
                render={<span className="truncate text-start text-xs text-muted-foreground" />}
              >
                {note}
              </TooltipTrigger>
              <TooltipContent>{note}</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      );
    },
  },
  {
    accessorKey: "direction",
    cell: ({ row }) => <DebtDirectionBadge direction={row.original.direction} />,
  },
  {
    accessorKey: "outstanding",
    header: () => <div data-currency>Outstanding</div>,
    cell: ({ row }) => {
      const { outstanding } = row.original;

      function formatDebtAmount(value: number) {
        return formatMoney(value, row.original.currency);
      }

      if (row.original.forgivenAt)
        return (
          <ForgivenOutstanding outstanding={outstanding} formatDebtAmount={formatDebtAmount} />
        );

      return (
        <DebtProgressRing
          direction={row.original.direction}
          amount={row.original.amount}
          outstanding={outstanding}
          repaid={row.original.repaid}
          formatDebtAmount={formatDebtAmount}
        />
      );
    },
  },
  {
    id: "ledgerMovement",
    header: "Ledger Movement",
    cell: ({ row }) => (
      <DebtBalanceSparkline
        direction={row.original.direction}
        amount={row.original.amount}
        repayments={row.original.repayments}
        formatDebtAmount={(value) => formatMoney(value, row.original.currency)}
      />
    ),
  },
  {
    id: "lastRepaymentDate",
    accessorFn: (debt) => debt.lastRepaymentDate ?? undefined,
    sortUndefined: "last",
    header: ({ column }) => (
      <SortableTableHead column={column}>Last Repayment Date</SortableTableHead>
    ),
    cell: ({ row }) => {
      const { lastRepaymentDate } = row.original;

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
