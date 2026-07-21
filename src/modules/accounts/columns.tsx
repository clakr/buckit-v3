import type { ColumnDef } from "@tanstack/react-table";

import { IconCircleDashed } from "@tabler/icons-react";

import type { getBankAccounts } from "#/modules/accounts/functions";

import { Badge } from "#/components/ui/badge";
import { currencyCodec } from "#/lib/codecs";
import { formatCurrency, formatToRelative, getCurrency, isCurrencyCode } from "#/lib/utils";
import { AccountActionsDropdownMenu } from "#/modules/accounts/components/account-actions-dropdown-menu";

export const columns: ColumnDef<Awaited<ReturnType<typeof getBankAccounts>>[number]>[] = [
  {
    accessorKey: "name",
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
    header: "Unallocated / Balance",
    cell: ({ row }) => {
      const balance =
        row.original.startingBalance +
        row.original.transactions.reduce(
          (acc, t) => (t.type === "income" ? acc + t.amount : acc - t.amount),
          0,
        );

      const unallocated = balance - row.original.allocations.reduce((acc, a) => acc + a.amount, 0);

      return `${formatCurrency(currencyCodec.encode(unallocated), {
        currency: row.original.currency,
      })} / ${formatCurrency(currencyCodec.encode(balance), {
        currency: row.original.currency,
      })}`;
    },
  },
  {
    accessorKey: "lastTransactionDate",
    header: "Last Transaction Date",

    cell: ({ row }) => {
      const firstTransaction = row.original.transactions.at(0);
      if (!firstTransaction)
        return (
          <Badge variant="secondary" className="uppercase">
            <IconCircleDashed />
            No Transactions
          </Badge>
        );

      return formatToRelative(firstTransaction.createdAt);
    },
  },
  {
    accessorKey: "actions",
    header: "",
    cell: ({ row }) => <AccountActionsDropdownMenu account={row.original} />,
  },
];
