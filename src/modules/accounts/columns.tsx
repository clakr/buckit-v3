import type { ColumnDef } from "@tanstack/react-table";

import { IconCircleDashed, IconCircleDottedLetterH } from "@tabler/icons-react";

import type { Allocation, Bucket, Transaction } from "#/db/schema";
import type { getBankAccount, getBankAccounts } from "#/modules/accounts/functions";

import { SortableTableHead } from "#/components/table/sortable-table-head";
import { Badge } from "#/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { currencyCodec } from "#/lib/codecs";
import {
  formatCurrency,
  formatDate,
  formatToRelative,
  getCurrency,
  isCurrencyCode,
} from "#/lib/utils";
import { AccountActionsDropdownMenu } from "#/modules/accounts/components/account-actions-dropdown-menu";
import { AllocationActionsDropdownMenu } from "#/modules/accounts/components/allocation-actions-dropdown-menu";
import { TransactionActionsDropdownMenu } from "#/modules/accounts/components/transaction-actions-dropdown-menu";
import { getAccountUnallocatedBalance } from "#/modules/accounts/utils";

export const INDEX_COLUMNS: ColumnDef<Awaited<ReturnType<typeof getBankAccounts>>[number]>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableTableHead column={column}>Name</SortableTableHead>,
  },
  {
    accessorKey: "currency",
    cell: ({ row }) => {
      const value = row.original.currency;

      const validated = isCurrencyCode(value);
      if (!validated) return `Unknown Currency`;

      const currency = getCurrency(value);
      if (!currency) return `Unknown Currency`;

      return (
        <div className="flex items-center gap-x-2">
          <Badge>{currency.code}</Badge>
          <span className="text-muted-foreground">{currency.name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "balance",
    header: ({ column }) => <SortableTableHead column={column}>Balance</SortableTableHead>,
    sortingFn: (rowA, rowB) => {
      const { balance: rowABalance } = getAccountUnallocatedBalance({
        startingBalance: rowA.original.startingBalance,
        transactions: rowA.original.transactions,
        allocations: rowA.original.allocations,
      });

      const { balance: rowBBalance } = getAccountUnallocatedBalance({
        startingBalance: rowB.original.startingBalance,
        transactions: rowB.original.transactions,
        allocations: rowB.original.allocations,
      });

      if (rowABalance === rowBBalance) return 0;

      return rowABalance - rowBBalance;
    },
    cell: ({ row }) => {
      const { balance } = getAccountUnallocatedBalance({
        startingBalance: row.original.startingBalance,
        transactions: row.original.transactions,
        allocations: row.original.allocations,
      });

      const value = formatCurrency(currencyCodec.encode(balance), {
        currency: row.original.currency,
      });

      return <span className="font-medium">{value}</span>;
    },
  },
  {
    accessorKey: "unallocated",
    header: ({ column }) => <SortableTableHead column={column}>Unallocated</SortableTableHead>,
    sortingFn: (rowA, rowB) => {
      const { unallocated: rowAUnallocated } = getAccountUnallocatedBalance({
        startingBalance: rowA.original.startingBalance,
        transactions: rowA.original.transactions,
        allocations: rowA.original.allocations,
      });

      const { unallocated: rowBUnallocated } = getAccountUnallocatedBalance({
        startingBalance: rowB.original.startingBalance,
        transactions: rowB.original.transactions,
        allocations: rowB.original.allocations,
      });

      if (rowAUnallocated === rowBUnallocated) return 0;

      return rowAUnallocated - rowBUnallocated;
    },
    cell: ({ row }) => {
      const { unallocated } = getAccountUnallocatedBalance({
        startingBalance: row.original.startingBalance,
        transactions: row.original.transactions,
        allocations: row.original.allocations,
      });

      const value = formatCurrency(currencyCodec.encode(unallocated), {
        currency: row.original.currency,
      });

      return <span className="font-medium">{value}</span>;
    },
  },
  {
    accessorKey: "lastTransactionDate",
    header: ({ column }) => (
      <SortableTableHead column={column}>Last Transaction Date</SortableTableHead>
    ),
    sortingFn: (rowA, rowB) => {
      const dateA = rowA.original.transactions.at(0)?.date;
      const dateB = rowB.original.transactions.at(0)?.date;

      // no transactions → treat as oldest possible, so it always sorts last when descending
      const timeA = dateA ? dateA.getTime() : Number.NEGATIVE_INFINITY;
      const timeB = dateB ? dateB.getTime() : Number.NEGATIVE_INFINITY;

      return timeA - timeB;
    },
    cell: ({ row }) => {
      const firstTransaction = row.original.transactions.at(0);
      if (!firstTransaction)
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
            {formatToRelative(firstTransaction.date)}
          </TooltipTrigger>
          <TooltipContent>{formatDate(firstTransaction.date)}</TooltipContent>
        </Tooltip>
      );
    },
  },
  {
    accessorKey: "actions",
    header: "",
    cell: ({ row }) => <AccountActionsDropdownMenu account={row.original} />,
  },
];

export const TRANSACTIONS_COLUMNS: ColumnDef<
  NonNullable<Awaited<ReturnType<typeof getBankAccount>>>["transactions"][number]
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
          <TooltipContent>{formatDate(date)}</TooltipContent>
        </Tooltip>
      );
    },
  },
  {
    accessorKey: "type",
    cell: ({ getValue }) => {
      const type = getValue<Transaction["type"]>();

      return (
        <Badge variant={type === "income" ? "default" : "secondary"} className="capitalize">
          {type}
        </Badge>
      );
    },
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
    cell: ({ row }) => <TransactionActionsDropdownMenu transactionId={row.original.id} />,
  },
];

export const ALLOCATIONS_COLUMNS: ColumnDef<
  NonNullable<Awaited<ReturnType<typeof getBankAccount>>>["allocations"][number]
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
          <TooltipContent>{formatDate(date)}</TooltipContent>
        </Tooltip>
      );
    },
  },
  {
    accessorKey: "bucket.name",
    header: "Bucket",
    cell: ({ getValue }) => <span className="font-semibold">{getValue<Bucket["name"]>()}</span>,
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
