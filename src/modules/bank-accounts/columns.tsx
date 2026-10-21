import type { ColumnDef } from "@tanstack/react-table";

import { IconBucket, IconCircleDashed, IconCircleDottedLetterH } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import type { Transaction } from "#/db/schema";
import type { getBankAccount, getBankAccounts } from "#/modules/bank-accounts/functions";

import { SortableTableHead } from "#/components/table/sortable-table-head";
import { Badge } from "#/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { formatMoney } from "#/lib/money";
import { formatDateTime, formatToRelative } from "#/lib/utils";
import { BankAccountActionsDropdownMenu } from "#/modules/bank-accounts/components/bank-account-actions-dropdown-menu";
import { TransactionActionsDropdownMenu } from "#/modules/transactions/components/transaction-actions-dropdown-menu";

export const INDEX_COLUMNS: ColumnDef<Awaited<ReturnType<typeof getBankAccounts>>[number]>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableTableHead column={column}>Name</SortableTableHead>,
    cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
  },
  {
    accessorKey: "balance",
    header: () => <div data-currency>Balance</div>,
    cell: ({ row }) => {
      const value = formatMoney(row.original.balance, row.original.currency);

      return <span className="block text-end font-semibold tabular-nums">{value}</span>;
    },
  },
  {
    accessorKey: "unallocated",
    header: () => <div data-currency>Unallocated</div>,
    cell: ({ row }) => {
      const value = formatMoney(row.original.unallocated, row.original.currency);

      return <span className="block text-end font-medium tabular-nums">{value}</span>;
    },
  },
  {
    accessorKey: "lastTransactionDate",
    header: ({ column }) => (
      <SortableTableHead column={column}>Last Transaction Date</SortableTableHead>
    ),
    sortingFn: (rowA, rowB) => {
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
          <Badge variant="secondary" className="uppercase">
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

export const TRANSACTIONS_COLUMNS: ColumnDef<
  Awaited<ReturnType<typeof getBankAccount>>["transactions"][number]
>[] = [
  {
    accessorKey: "date",
    header: ({ column }) => <SortableTableHead column={column}>Date</SortableTableHead>,
    cell: ({ getValue }) => {
      const date = getValue<Transaction["date"]>();

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
    accessorKey: "type",
    cell: ({ row }) => {
      const { type, withdrawal } = row.original;

      return (
        <span className="flex items-center gap-x-2">
          <Badge variant={type === "income" ? "default" : "secondary"} className="capitalize">
            {type}
          </Badge>
          {withdrawal ? (
            <Badge
              variant="outline"
              render={<Link to="/buckets/$bucketId" params={{ bucketId: withdrawal.bucket.id }} />}
            >
              <IconBucket />
              From {withdrawal.bucket.name}
            </Badge>
          ) : null}
        </span>
      );
    },
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
  {
    accessorKey: "actions",
    header: "",
    cell: ({ row }) => <TransactionActionsDropdownMenu transactionId={row.original.id} />,
  },
];
