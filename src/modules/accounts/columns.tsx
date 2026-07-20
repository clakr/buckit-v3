import type { ColumnDef } from "@tanstack/react-table";

import { IconCircleDashed } from "@tabler/icons-react";

import type { BankAccount, Transaction } from "#/db/schema";
import type { Currency } from "#/lib/types";

import { Badge } from "#/components/ui/badge";
import { currencyCodec } from "#/lib/codecs";
import { currencies } from "#/lib/constants";
import { formatCurrency, formatToRelative } from "#/lib/utils";

import { AccountActionsDropdownMenu } from "./components/account-actions-dropdown-menu";

function isCurrencyCode(code: string): code is Currency["code"] {
  return currencies.some((currency) => currency.code === code);
}

function getCurrencyName(code: Currency["code"]) {
  return currencies.find((currency) => currency.code === code);
}

export const columns: ColumnDef<BankAccount & { transactions: Transaction[] }>[] = [
  {
    accessorKey: "name",
  },
  {
    accessorKey: "currency",
    cell: ({ getValue }) => {
      const value = getValue<BankAccount["currency"]>();

      const validated = isCurrencyCode(value);
      if (!validated) return `Unknown Currency`;

      const currency = getCurrencyName(value);
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

      const unallocated = balance; // @todo: revisit once allocations are implemented

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
    cell: ({ row }) => <AccountActionsDropdownMenu accountId={row.original.id} />,
  },
];
