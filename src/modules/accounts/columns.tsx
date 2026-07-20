import type { ColumnDef } from "@tanstack/react-table";

import type { BankAccount } from "#/db/schema";
import type { Currency } from "#/lib/types";

import { Badge } from "#/components/ui/badge";
import { currencyCodec } from "#/lib/codecs";
import { currencies } from "#/lib/constants";
import { formatCurrency } from "#/lib/utils";

import { AccountActionsDropdownMenu } from "./components/account-actions-dropdown-menu";

function isCurrencyCode(code: string): code is Currency["code"] {
  return currencies.some((currency) => currency.code === code);
}

function getCurrencyName(code: Currency["code"]) {
  return currencies.find((currency) => currency.code === code);
}

export const columns: ColumnDef<BankAccount>[] = [
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
      return `N/A / ${formatCurrency(currencyCodec.encode(row.original.startingBalance), {
        currency: row.original.currency,
      })}`;
    }, // @todo: revisit once account entries are implemented
  },
  {
    accessorKey: "lastAccountEntryDate",
    header: "Last Account Entry Date",
    cell: "N/A", // @todo: revisit once account entries are implemented
  },
  {
    accessorKey: "actions",
    header: "",
    cell: ({ row }) => <AccountActionsDropdownMenu accountId={row.original.id} />,
  },
];
