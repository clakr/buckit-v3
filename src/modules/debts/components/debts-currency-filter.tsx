import { IconFilter } from "@tabler/icons-react";

import type { Debt } from "#/db/schema";
import type { DebtCurrencyTotals } from "#/modules/debts/components/debts-overview";

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
import { CURRENCIES } from "#/lib/constants";

type Props = {
  currencyTotals: DebtCurrencyTotals[];
  selectedCurrencies: Debt["currency"][];
  onSelectedCurrenciesChange: (currencies: Debt["currency"][]) => void;
};

export function DebtsCurrencyFilter({
  currencyTotals,
  selectedCurrencies,
  onSelectedCurrenciesChange,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        <IconFilter className="mb-0.5 size-3.5" aria-hidden />
        Currency
        {selectedCurrencies.length ? (
          <Badge variant="outline" className="tabular-nums">
            {selectedCurrencies.length}
          </Badge>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Filter by currency</DropdownMenuLabel>
          {currencyTotals.map(({ currency, debtCount }) => (
            <DropdownMenuCheckboxItem
              key={currency}
              checked={selectedCurrencies.includes(currency)}
              onCheckedChange={(checked) =>
                onSelectedCurrenciesChange(
                  checked
                    ? [...selectedCurrencies, currency]
                    : selectedCurrencies.filter((selected) => selected !== currency),
                )
              }
            >
              <span aria-hidden>{CURRENCIES.find(({ code }) => code === currency)?.flag}</span>
              {currency}
              <span className="ms-auto text-muted-foreground tabular-nums">{debtCount}</span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        {selectedCurrencies.length ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSelectedCurrenciesChange([])}>
              Clear Filter
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
