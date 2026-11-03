import { IconProgressCheck } from "@tabler/icons-react";

import type { getDebts } from "#/modules/debts/functions";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

import type { DebtStatus } from "../figures.server";

type DebtRow = Awaited<ReturnType<typeof getDebts>>[number];

export const DEBT_STATUSES = ["open", "settled", "forgiven"] as const satisfies DebtStatus[];

const DEBT_STATUS_LABELS = {
  open: "Open",
  settled: "Settled",
  forgiven: "Forgiven",
} satisfies Record<DebtStatus, string>;

type Props = {
  debts: Pick<DebtRow, "status">[];
  selectedStatuses: DebtStatus[];
  onSelectedStatusesChange: (statuses: DebtStatus[]) => void;
};

export function DebtsStatusFilter({ debts, selectedStatuses, onSelectedStatusesChange }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        <IconProgressCheck className="mb-0.5 size-3.5" aria-hidden />
        Status
        {selectedStatuses.length ? (
          <Badge variant="outline" className="tabular-nums">
            {selectedStatuses.length}
          </Badge>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
          {DEBT_STATUSES.map((status) => (
            <DropdownMenuCheckboxItem
              key={status}
              checked={selectedStatuses.includes(status)}
              onCheckedChange={(checked) =>
                onSelectedStatusesChange(
                  checked
                    ? [...selectedStatuses, status]
                    : selectedStatuses.filter((selected) => selected !== status),
                )
              }
            >
              {DEBT_STATUS_LABELS[status]}
              <span className="ms-auto text-muted-foreground tabular-nums">
                {debts.filter((debt) => debt.status === status).length}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        {selectedStatuses.length ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSelectedStatusesChange([])}>
              Clear Filter
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
