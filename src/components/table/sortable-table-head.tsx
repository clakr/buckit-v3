import type { Column, RowData } from "@tanstack/react-table";
import type { ComponentProps } from "react";

import { IconArrowDown, IconArrowsSort, IconArrowUp } from "@tabler/icons-react";
import { Subscribe } from "@tanstack/react-table";

import type { DATA_TABLE_FEATURES } from "#/components/ui/data-table";

import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

type Props<TData extends RowData> = {
  column: Column<typeof DATA_TABLE_FEATURES, TData>;
} & ComponentProps<"button">;

export function SortableTableHead<TData extends RowData>({
  column,
  children,
  className,
  ...props
}: Props<TData>) {
  return (
    <Subscribe
      source={column.table.atoms.sorting}
      selector={(sorting) => sorting.find(({ id }) => id === column.id)?.desc}
    >
      {(isDescending) => {
        const SortIcon =
          isDescending === undefined ? IconArrowsSort : isDescending ? IconArrowDown : IconArrowUp;

        return (
          <Button
            variant="ghost"
            className={cn(
              "-ms-2 justify-start gap-x-2 uppercase",
              "data-currency:ms-0 data-currency:-me-2",
              className,
            )}
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            {...props}
          >
            {children}
            <SortIcon />
          </Button>
        );
      }}
    </Subscribe>
  );
}
