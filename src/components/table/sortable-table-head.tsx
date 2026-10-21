import type { Column, RowData } from "@tanstack/react-table";
import type { ComponentProps } from "react";

import { IconArrowsSort } from "@tabler/icons-react";

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
      <IconArrowsSort />
    </Button>
  );
}
