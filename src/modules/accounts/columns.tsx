import type { ColumnDef } from "@tanstack/react-table";

import { IconDots, IconEdit, IconEye, IconTrash } from "@tabler/icons-react";

import type { BankAccount } from "#/db/schema";
import type { Currency } from "#/lib/types";

import { Badge } from "#/components/ui/badge";
import { currencies } from "#/lib/constants";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    cell: "N/A / N/A", // @todo: revisit once account entries are implemented
  },
  {
    accessorKey: "lastAccountEntryDate",
    header: "Last Account Entry Date",
    cell: "N/A", // @todo: revisit once account entries are implemented
  },
  {
    accessorKey: "actions",
    header: "",
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <IconDots />
            <span className="sr-only">Open Bank Account Action Menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuItem disabled>
              <IconEye />
              View Detail
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <IconEdit />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <IconTrash />
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
