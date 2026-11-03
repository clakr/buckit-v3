import type { DataTableColumnDef } from "#/components/ui/data-table";
import type { Debt } from "#/db/schema";

import { SortableTableHead } from "#/components/table/sortable-table-head";
import { formatMoney } from "#/lib/money";

import type { DebtStatus } from "./figures.server";
import type { getDebts } from "./functions";

import { DebtActionsDropdownMenu } from "./components/debt-actions-dropdown-menu";
import { DebtActivityCell } from "./components/debt-activity-cell";
import { DebtCounterpartyCell } from "./components/debt-counterparty-cell";
import { DebtProgressRing } from "./components/debt-progress-ring";
import { ForgivenOutstanding } from "./components/forgiven-outstanding";

type DebtRow = Awaited<ReturnType<typeof getDebts>>[number];

export const DEBT_SORT_COLUMN_IDS = ["name", "outstanding", "activity"] as const;

const STATUS_RANK = {
  open: 0,
  settled: 1,
  forgiven: 2,
} satisfies Record<DebtStatus, number>;

export function getDebtLastActivityTime(debt: Pick<DebtRow, "date" | "lastRepaymentDate">) {
  return (debt.lastRepaymentDate ?? debt.date).getTime();
}

export function sortDebtsByQuietness(debts: DebtRow[]) {
  return [...debts].sort((a, b) => {
    const rankDifference = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (rankDifference) return rankDifference;

    const activityDifference = getDebtLastActivityTime(a) - getDebtLastActivityTime(b);
    return a.status === "open" ? activityDifference : -activityDifference;
  });
}

const OUTSTANDING_SORT_DISABLED_REASON = "Filter to one currency to sort by outstanding.";

export function getIndexColumns({
  outstandingSortCurrency,
}: {
  outstandingSortCurrency: Debt["currency"] | null;
}): DataTableColumnDef<DebtRow>[] {
  return [
    {
      accessorKey: "name",
      meta: {
        className:
          "max-sm:sticky max-sm:start-0 max-sm:z-10 max-sm:bg-card max-sm:shadow-[inset_-1px_0_0_var(--border)]",
      },
      header: ({ column }) => <SortableTableHead column={column}>Name</SortableTableHead>,
      cell: ({ row }) => <DebtCounterpartyCell debt={row.original} />,
    },
    {
      id: "outstanding",
      accessorFn: ({ currency, status, outstanding }) =>
        currency === outstandingSortCurrency
          ? status === "forgiven"
            ? 0
            : outstanding
          : undefined,
      enableSorting: outstandingSortCurrency !== null,
      sortFn: "basic",
      sortUndefined: "last",
      header: ({ column }) => (
        <SortableTableHead
          column={column}
          disabledReason={OUTSTANDING_SORT_DISABLED_REASON}
          data-currency
        >
          Outstanding
        </SortableTableHead>
      ),
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
      meta: { className: "max-lg:hidden" },
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
}
