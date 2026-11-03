import type { Column, RowData } from "@tanstack/react-table";
import type { ComponentProps } from "react";

import { IconArrowDown, IconArrowsSort, IconArrowUp } from "@tabler/icons-react";
import { Subscribe } from "@tanstack/react-table";

import type { DATA_TABLE_FEATURES } from "#/components/ui/data-table";

import { Button } from "#/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { cn } from "#/lib/utils";

type Props<TData extends RowData> = {
  column: Column<typeof DATA_TABLE_FEATURES, TData>;
  disabledReason?: string;
} & ComponentProps<"button">;

export function SortableTableHead<TData extends RowData>({
  column,
  disabledReason,
  children,
  className,
  ...props
}: Props<TData>) {
  const buttonClassName = cn(
    "-ms-2 justify-start gap-x-2 uppercase",
    "data-currency:ms-0 data-currency:-me-2",
    className,
  );

  if (!column.getCanSort())
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              aria-disabled
              className={cn(buttonClassName, "cursor-not-allowed opacity-60 hover:bg-transparent")}
              {...props}
            />
          }
        >
          {children}
          <IconArrowsSort />
        </TooltipTrigger>
        {disabledReason ? <TooltipContent>{disabledReason}</TooltipContent> : null}
      </Tooltip>
    );

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
            className={buttonClassName}
            onClick={column.getToggleSortingHandler()}
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
