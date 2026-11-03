import {
  type ColumnDef,
  createPaginatedRowModel,
  createSortedRowModel,
  flexRender,
  metaHelper,
  type RowData,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  type SortingState,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { useState, type ReactNode } from "react";

import { Pager } from "#/components/pager";
import { PAGE_SIZES, type PageSize } from "#/lib/paging";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const DATA_TABLE_FEATURES = tableFeatures({
  columnMeta: metaHelper<{ className?: string }>(),
  rowSortingFeature,
  rowPaginationFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
});

const ARIA_SORT = {
  asc: "ascending",
  desc: "descending",
} as const;

export type DataTableColumnDef<TData extends RowData> = ColumnDef<
  typeof DATA_TABLE_FEATURES,
  TData
>;

export type DataTablePagination = {
  state: { pageIndex: number; pageSize: PageSize };
  onChange: (state: { pageIndex: number; pageSize: PageSize }) => void;
};

interface DataTableProps<TData extends RowData> {
  columns: DataTableColumnDef<TData>[];
  data: TData[];
  initialSorting?: SortingState;
  emptyState?: ReactNode;
  pagination?: DataTablePagination;
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  initialSorting = [],
  emptyState,
  pagination,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);

  const total = data.length;
  const pageSize = pagination?.state.pageSize ?? PAGE_SIZES[0];
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);
  const pageIndex = Math.min(pagination?.state.pageIndex ?? 0, pageCount - 1);

  const table = useTable({
    features: DATA_TABLE_FEATURES,
    data,
    columns,

    onSortingChange: (updater) => {
      setSorting((previous) => {
        const next = typeof updater === "function" ? updater(previous) : updater;
        return next.length ? next : initialSorting;
      });
      if (pagination && pagination.state.pageIndex !== 0)
        pagination.onChange({ pageIndex: 0, pageSize });
    },
    state: {
      sorting,
      pagination: { pageIndex, pageSize },
    },

    manualPagination: !pagination,
    autoResetPageIndex: false,
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sortDirection = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={sortDirection ? ARIA_SORT[sortDirection] : undefined}
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : emptyState ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="whitespace-normal">
                  {emptyState}
                </TableCell>
              </TableRow>
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination ? (
        <Pager
          paging={{ pageIndex, pageSize, pageCount, total }}
          onPageChange={(nextPageIndex) =>
            pagination.onChange({ pageIndex: nextPageIndex, pageSize })
          }
          onPageSizeChange={(nextPageSize) =>
            pagination.onChange({ pageIndex: 0, pageSize: nextPageSize })
          }
        />
      ) : null}
    </div>
  );
}
