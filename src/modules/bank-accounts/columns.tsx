import { IconCircleDashed, IconCircleDottedLetterH } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import type { DataTableColumnDef } from "#/components/ui/data-table";
import type { getBankAccountsWithTrend } from "#/modules/bank-accounts/functions";

import { SortableTableHead } from "#/components/table/sortable-table-head";
import { Badge } from "#/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { formatMoney } from "#/lib/money";
import { formatDateTime, formatToRelative } from "#/lib/utils";
import { BalanceTrendSparkline } from "#/modules/bank-accounts/components/balance-trend-sparkline";
import { BankAccountActionsDropdownMenu } from "#/modules/bank-accounts/components/bank-account-actions-dropdown-menu";
import { NetChangeAmount } from "#/modules/bank-accounts/components/net-change-cell";
import { UnallocatedEarmarkCell } from "#/modules/bank-accounts/components/unallocated-earmark-cell";
import { BALANCE_TREND_DAYS } from "#/modules/bank-accounts/utils";

type AccountRow = Awaited<ReturnType<typeof getBankAccountsWithTrend>>[number];

const AMOUNT_SORT_DISABLED_REASON = "Filter to one currency to sort by amount.";

export function getIndexColumns({
  canSortAmounts,
}: {
  canSortAmounts: boolean;
}): DataTableColumnDef<AccountRow>[] {
  return [
    {
      accessorKey: "name",
      meta: {
        className:
          "max-sm:sticky max-sm:start-0 max-sm:z-10 max-sm:bg-card max-sm:shadow-[inset_-1px_0_0_var(--border)]",
      },
      header: ({ column }) => <SortableTableHead column={column}>Name</SortableTableHead>,
      cell: ({ row }) => (
        <Link
          to="/accounts/$accountId"
          params={{ accountId: row.original.id }}
          className="block max-w-[20ch] font-semibold wrap-break-word whitespace-normal underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "balance",
      enableSorting: canSortAmounts,
      sortFn: "basic",
      header: ({ column }) => (
        <SortableTableHead
          column={column}
          disabledReason={AMOUNT_SORT_DISABLED_REASON}
          data-currency
        >
          Balance
        </SortableTableHead>
      ),
      cell: ({ row }) => {
        const value = formatMoney(row.original.balance, row.original.currency);

        return <span className="block text-end font-semibold tabular-nums">{value}</span>;
      },
    },
    {
      id: "change",
      accessorFn: (account) => account.trend.net,
      enableSorting: canSortAmounts,
      sortFn: "basic",
      header: ({ column }) => (
        <SortableTableHead
          column={column}
          disabledReason={AMOUNT_SORT_DISABLED_REASON}
          data-currency
        >
          Change ({BALANCE_TREND_DAYS}d)
        </SortableTableHead>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col items-end gap-y-1 [&_svg[role=img]]:h-6">
          {row.original.trend.hasActivity ? (
            <NetChangeAmount net={row.original.trend.net} currency={row.original.currency} />
          ) : (
            <span className="text-muted-foreground">No activity</span>
          )}
          <BalanceTrendSparkline trend={row.original.trend} currency={row.original.currency} />
        </div>
      ),
    },
    {
      accessorKey: "unallocated",
      enableSorting: canSortAmounts,
      sortFn: "basic",
      header: ({ column }) => (
        <SortableTableHead
          column={column}
          disabledReason={AMOUNT_SORT_DISABLED_REASON}
          data-currency
        >
          Unallocated
        </SortableTableHead>
      ),
      cell: ({ row }) => (
        <UnallocatedEarmarkCell
          balance={row.original.balance}
          unallocated={row.original.unallocated}
          totalEarmarked={row.original.totalEarmarked}
          currency={row.original.currency}
        />
      ),
    },
    {
      accessorKey: "lastTransactionDate",
      meta: { className: "max-lg:hidden" },
      header: ({ column }) => (
        <SortableTableHead column={column}>Last Transaction Date</SortableTableHead>
      ),
      sortFn: (rowA, rowB) => {
        const dateA = rowA.original.lastTransactionDate;
        const dateB = rowB.original.lastTransactionDate;

        const timeA = dateA ? dateA.getTime() : Number.NEGATIVE_INFINITY;
        const timeB = dateB ? dateB.getTime() : Number.NEGATIVE_INFINITY;

        return timeA - timeB;
      },
      cell: ({ row }) => {
        const { lastTransactionDate } = row.original;
        if (!lastTransactionDate)
          return (
            <Badge variant="secondary">
              <IconCircleDashed />
              No Transactions
            </Badge>
          );

        return (
          <Tooltip>
            <TooltipTrigger render={<Badge variant="secondary" className="capitalize" />}>
              <IconCircleDottedLetterH />
              {formatToRelative(lastTransactionDate)}
            </TooltipTrigger>
            <TooltipContent>{formatDateTime(lastTransactionDate)}</TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: "actions",
      header: "",
      cell: ({ row }) => <BankAccountActionsDropdownMenu account={row.original} />,
    },
  ];
}
