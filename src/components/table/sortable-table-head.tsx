import type { Column } from "@tanstack/react-table";
import type { ComponentProps } from "react";

import { IconArrowsSort } from "@tabler/icons-react";

import { Button } from "../ui/button";

type Props = { column: Column<any, unknown> } & ComponentProps<"button">;

export function SortableTableHead({ column, children, ...props }: Props) {
  return (
    <Button
      variant="ghost"
      className="-ms-2 justify-start gap-x-2 uppercase"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      {...props}
    >
      {children}
      <IconArrowsSort />
    </Button>
  );
}
