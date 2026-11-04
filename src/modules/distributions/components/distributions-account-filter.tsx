import { IconFilter } from "@tabler/icons-react";

import type { BankAccount } from "#/db/schema";

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

export type DistributionAccountCount = Pick<BankAccount, "id" | "name" | "currency"> & {
  distributionCount: number;
};

export function getDistributionAccountCounts(
  distributions: { bankAccount: Pick<BankAccount, "id" | "name" | "currency"> }[],
) {
  const countsById = new Map<string, DistributionAccountCount>();
  for (const { bankAccount } of distributions) {
    const counts = countsById.get(bankAccount.id) ?? { ...bankAccount, distributionCount: 0 };
    counts.distributionCount += 1;
    countsById.set(bankAccount.id, counts);
  }

  return [...countsById.values()].sort((a, b) => a.name.localeCompare(b.name));
}

type Props = {
  accountCounts: DistributionAccountCount[];
  selectedAccountIds: string[];
  onSelectedAccountIdsChange: (accountIds: string[]) => void;
};

export function DistributionsAccountFilter({
  accountCounts,
  selectedAccountIds,
  onSelectedAccountIdsChange,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        <IconFilter className="mb-0.5 size-3.5" aria-hidden />
        Bank Account
        {selectedAccountIds.length ? (
          <Badge variant="outline" className="tabular-nums">
            {selectedAccountIds.length}
          </Badge>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Filter by bank account</DropdownMenuLabel>
          {accountCounts.map(({ id, name, currency, distributionCount }) => (
            <DropdownMenuCheckboxItem
              key={id}
              checked={selectedAccountIds.includes(id)}
              onCheckedChange={(checked) =>
                onSelectedAccountIdsChange(
                  checked
                    ? [...selectedAccountIds, id]
                    : selectedAccountIds.filter((selected) => selected !== id),
                )
              }
            >
              <span className="min-w-0 truncate">{name}</span>
              <span className="text-xs text-muted-foreground">{currency}</span>
              <span className="ms-auto text-muted-foreground tabular-nums">
                {distributionCount}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        {selectedAccountIds.length ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSelectedAccountIdsChange([])}>
              Clear Filter
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
