import { flexRender, useTable, type RowData, type SortingState } from "@tanstack/react-table";
import { useState } from "react";

import { Pager } from "#/components/pager";
import {
  DATA_TABLE_FEATURES,
  type DataTablePagination,
  type DataTableColumnDef,
} from "#/components/ui/data-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { PAGE_SIZES } from "#/lib/paging";

const ARIA_SORT = {
  asc: "ascending",
  desc: "descending",
} as const;

type Props<TData extends RowData> = {
  columns: DataTableColumnDef<TData>[];
  data: TData[];
  initialSorting: SortingState;
  pagination: DataTablePagination;
};

export function AccountsTable<TData extends RowData>({
  columns,
  data,
  initialSorting,
  pagination,
}: Props<TData>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);

  const total = data.length;
  const { pageSize } = pagination.state;
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  const pageIndex = Math.min(pagination.state.pageIndex, pageCount - 1);

  const table = useTable({
    features: DATA_TABLE_FEATURES,
    data,
    columns,

    onSortingChange: (updater) => {
      setSorting(updater);
      if (pageIndex !== 0) pagination.onChange({ pageIndex: 0, pageSize });
    },
    state: {
      sorting,
      pagination: { pageIndex, pageSize },
    },
    sortDescFirst: true,

    autoResetPageIndex: false,
  });

  return (
    <>
      <Table>
        <TableHeader className="bg-muted/50">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const sortDirection = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    aria-sort={sortDirection ? ARIA_SORT[sortDirection] : undefined}
                    className="border-s font-sans font-medium normal-case first:border-s-0 [&_button]:normal-case"
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
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {total > PAGE_SIZES[0] ? (
        <div className="border-t p-4">
          <Pager
            paging={{ pageIndex, pageSize, pageCount, total }}
            onPageChange={(nextPageIndex) =>
              pagination.onChange({ pageIndex: nextPageIndex, pageSize })
            }
            onPageSizeChange={(nextPageSize) =>
              pagination.onChange({ pageIndex: 0, pageSize: nextPageSize })
            }
          />
        </div>
      ) : null}
    </>
  );
}
