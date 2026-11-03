import { IconFilter } from "@tabler/icons-react";

import type { BankAccount } from "#/db/schema";
import type { CurrencyTotals } from "#/modules/bank-accounts/components/accounts-overview";

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
  currencyTotals: CurrencyTotals[];
  selectedCurrencies: BankAccount["currency"][];
  onSelectedCurrenciesChange: (currencies: BankAccount["currency"][]) => void;
};

export function AccountsCurrencyFilter({
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
          {currencyTotals.map(({ currency, accountCount }) => (
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
              <span className="ms-auto text-muted-foreground tabular-nums">{accountCount}</span>
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
