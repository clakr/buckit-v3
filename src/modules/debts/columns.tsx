import type { ColumnDef } from "@tanstack/react-table";

import { IconCircleDashed } from "@tabler/icons-react";

import { SortableTableHead } from "#/components/table/sortable-table-head";
import { Badge } from "#/components/ui/badge";
import { currencyCodec } from "#/lib/codecs";
import { formatCurrency, getCurrency, isCurrencyCode } from "#/lib/utils";

import type { getDebts } from "./functions";

import { DebtActionsDropdownMenu } from "./components/debt-actions-dropdown-menu";

export const INDEX_COLUMNS: ColumnDef<Awaited<ReturnType<typeof getDebts>>[number]>[] = [
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
    accessorKey: "amount",
    header: ({ column }) => (
      <SortableTableHead column={column} data-currency>
        Amount
      </SortableTableHead>
    ),
    cell: ({ row }) => {
      const value = formatCurrency(currencyCodec.encode(row.original.amount), {
        currency: row.original.currency,
      });

      return <span className="block text-end font-medium">{value}</span>;
    },
  },
  {
    // @todo: this should be the value of amount − ∑ repayments, once repayments are implemented
    accessorKey: "outstanding",
    header: ({ column }) => (
      <SortableTableHead column={column} data-currency>
        Outstanding
      </SortableTableHead>
    ),
    cell: () => {
      return <span className="block text-end font-medium">-</span>;
    },
  },
  {
    accessorKey: "lastRepaymentDate",
    header: ({ column }) => (
      <SortableTableHead column={column}>Last Repayment Date</SortableTableHead>
    ),
    cell: () => {
      return (
        <Badge variant="secondary" className="uppercase">
          <IconCircleDashed />
          No Repayments
        </Badge>
      );
    },
  },
  {
    accessorKey: "actions",
    header: "",
    cell: ({ row }) => <DebtActionsDropdownMenu debtId={row.original.id} />,
  },
];
