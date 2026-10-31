import type { BankAccount } from "#/db/schema";

import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";

type Props = {
  currencies: BankAccount["currency"][];
  value: BankAccount["currency"];
  onValueChange: (currency: BankAccount["currency"]) => void;
};

export function CurrencySwitcher({ currencies, value, onValueChange }: Props) {
  if (currencies.length < 2) return null;

  return (
    <ToggleGroup
      aria-label="Currency"
      variant="outline"
      spacing={0}
      value={[value]}
      onValueChange={([selectedValue]) => {
        const currency = currencies.find((candidate) => candidate === selectedValue);
        if (currency) onValueChange(currency);
      }}
    >
      {currencies.map((currency) => (
        <ToggleGroupItem key={currency} value={currency}>
          {currency}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
