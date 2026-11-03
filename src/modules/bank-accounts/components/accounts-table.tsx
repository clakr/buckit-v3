import { flexRender, useTable, type RowData, type SortingState } from "@tanstack/react-table";
import { useState } from "react";

import type { PageSize } from "#/lib/paging";

import { DATA_TABLE_FEATURES, type DataTableColumnDef } from "#/components/ui/data-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { cn } from "#/lib/utils";

const ARIA_SORT = {
  asc: "ascending",
  desc: "descending",
} as const;

type Props<TData extends RowData> = {
  columns: DataTableColumnDef<TData>[];
  data: TData[];
  initialSorting: SortingState;
  pageIndex: number;
  pageSize: PageSize;
  onSortingChange: () => void;
};

export function AccountsTable<TData extends RowData>({
  columns,
  data,
  initialSorting,
  pageIndex,
  pageSize,
  onSortingChange,
}: Props<TData>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);

  const table = useTable({
    features: DATA_TABLE_FEATURES,
    data,
    columns,

    onSortingChange: (updater) => {
      setSorting((previous) => {
        const next = typeof updater === "function" ? updater(previous) : updater;
        return next.length ? next : initialSorting;
      });
      onSortingChange();
    },
    state: {
      sorting,
      pagination: { pageIndex, pageSize },
    },

    autoResetPageIndex: false,
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id} className="hover:bg-transparent">
            {headerGroup.headers.map((header) => {
              const sortDirection = header.column.getIsSorted();
              return (
                <TableHead
                  key={header.id}
                  aria-sort={sortDirection ? ARIA_SORT[sortDirection] : undefined}
                  className={cn(
                    "border-s font-medium first:border-0",
                    header.column.columnDef.meta?.className,
                  )}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getAllCells().map((cell) => (
              <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
