import type { ColumnDef } from "@tanstack/react-table";

import { IconCircleDashed, IconCircleDottedLetterH, IconInfoCircle } from "@tabler/icons-react";

import { SortableTableHead } from "#/components/table/sortable-table-head";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { currencyCodec } from "#/lib/codecs";
import { formatCurrency, formatDateTime, formatToRelative } from "#/lib/utils";
import { getRepaymentDate } from "#/modules/repayments/utils";

import type { getDebts } from "./functions";

import { DebtActionsDropdownMenu } from "./components/debt-actions-dropdown-menu";
import { getDebtOutstanding } from "./utils";

export const INDEX_COLUMNS: ColumnDef<Awaited<ReturnType<typeof getDebts>>[number]>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableTableHead column={column}>Name</SortableTableHead>,
    cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
  },
  {
    accessorKey: "direction",
    cell: ({ row }) => {
      const direction = row.original.direction;

      return (
        <Badge
          variant={direction === "receivable" ? "default" : "secondary"}
          className="capitalize"
        >
          {direction}
        </Badge>
      );
    },
  },
  {
    accessorKey: "outstanding",
    header: () => <div data-currency>Outstanding</div>,
    cell: ({ row }) => {
      const amount = row.original.amount;
      const outstanding = getDebtOutstanding({ amount, repayments: row.original.repayments });
      const repaid = amount - outstanding;

      const hasRepayments = repaid > 0;
      const repaymentsCount = row.original.repayments.length;

      return (
        <div className="flex items-center justify-end gap-1">
          {hasRepayments ? (
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-5 text-muted-foreground"
                    aria-label="Show original amount"
                  />
                }
              >
                <IconInfoCircle className="size-3.5" />
              </PopoverTrigger>
              <PopoverContent className="w-fit" align="end">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <dt className="text-muted-foreground">Original amount</dt>
                  <dd className="text-end font-medium tabular-nums">
                    {formatCurrency(currencyCodec.encode(amount), {
                      currency: row.original.currency,
                    })}
                  </dd>

                  <dt className="text-muted-foreground">
                    Repaid ({repaymentsCount} repayment{repaymentsCount > 1 ? "s" : null})
                  </dt>
                  <dd className="text-end font-medium tabular-nums">
                    {formatCurrency(currencyCodec.encode(repaid), {
                      currency: row.original.currency,
                    })}
                  </dd>
                </dl>
              </PopoverContent>
            </Popover>
          ) : null}

          <span className="text-end font-medium tabular-nums">
            {formatCurrency(currencyCodec.encode(outstanding), {
              currency: row.original.currency,
            })}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "lastRepaymentDate",
    header: ({ column }) => (
      <SortableTableHead column={column}>Last Repayment Date</SortableTableHead>
    ),
    cell: ({ row }) => {
      const lastRepayment = row.original.repayments[0];
      const lastRepaymentDate = lastRepayment ? getRepaymentDate(lastRepayment) : undefined;

      if (!lastRepaymentDate) {
        return (
          <Badge variant="secondary" className="uppercase">
            <IconCircleDashed />
            No Repayments
          </Badge>
        );
      }

      return (
        <Tooltip>
          <TooltipTrigger render={<Badge variant="secondary" className="capitalize" />}>
            <IconCircleDottedLetterH />
            {formatToRelative(lastRepaymentDate)}
          </TooltipTrigger>
          <TooltipContent>{formatDateTime(lastRepaymentDate)}</TooltipContent>
        </Tooltip>
      );
    },
  },
  {
    accessorKey: "actions",
    header: "",
    cell: ({ row }) => <DebtActionsDropdownMenu debt={row.original} />,
  },
];
