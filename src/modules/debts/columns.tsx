import type { DataTableColumnDef } from "#/components/ui/data-table";

import { SortableTableHead } from "#/components/table/sortable-table-head";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { formatMoney } from "#/lib/money";

import type { getDebts } from "./functions";

import { DebtActionsDropdownMenu } from "./components/debt-actions-dropdown-menu";
import { DebtActivityCell } from "./components/debt-activity-cell";
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
          <span className="block max-w-[20ch] font-semibold wrap-break-word whitespace-normal">
            {name}
          </span>
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
    id: "activity",
    accessorFn: (debt) => debt.lastRepaymentDate ?? debt.date,
    header: ({ column }) => <SortableTableHead column={column}>Activity</SortableTableHead>,
    cell: ({ row }) => (
      <DebtActivityCell
        date={row.original.date}
        lastRepaymentDate={row.original.lastRepaymentDate}
        repaymentCount={row.original.repayments.length}
      />
    ),
  },
  {
    accessorKey: "actions",
    header: "",
    cell: ({ row }) => <DebtActionsDropdownMenu debt={row.original} />,
  },
];
