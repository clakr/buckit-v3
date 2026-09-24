import type { Column } from "@tanstack/react-table";
import type { ComponentProps } from "react";

import { IconArrowsSort } from "@tabler/icons-react";

import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

type Props = { column: Column<any, unknown> } & ComponentProps<"button">;

export function SortableTableHead({ column, children, className, ...props }: Props) {
  return (
    <Button
      variant="ghost"
      className={cn("-ms-2 justify-start gap-x-2 uppercase", className)}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      {...props}
    >
      {children}
      <IconArrowsSort />
    </Button>
  );
}
