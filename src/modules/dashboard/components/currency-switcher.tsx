import type { BankAccount } from "#/db/schema";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";

type Props = {
  currencies: BankAccount["currency"][];
  value: BankAccount["currency"];
  onValueChange: (currency: BankAccount["currency"]) => void;
};

const TOGGLE_CURRENCY_LIMIT = 4;

export function CurrencySwitcher({ currencies, value, onValueChange }: Props) {
  if (currencies.length < 2) return null;

  function handleValueChange(selectedValue: unknown) {
    const currency = currencies.find((candidate) => candidate === selectedValue);
    if (currency) onValueChange(currency);
  }

  if (currencies.length > TOGGLE_CURRENCY_LIMIT) {
    return (
      <Select
        items={currencies.map((currency) => ({ value: currency, label: currency }))}
        value={value}
        onValueChange={handleValueChange}
      >
        <SelectTrigger aria-label="Currency" className="h-8 min-w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger>
          <SelectGroup>
            {currencies.map((currency) => (
              <SelectItem key={currency} value={currency}>
                {currency}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    );
  }

  return (
    <ToggleGroup
      aria-label="Currency"
      variant="outline"
      spacing={0}
      value={[value]}
      onValueChange={([selectedValue]) => handleValueChange(selectedValue)}
    >
      {currencies.map((currency) => (
        <ToggleGroupItem key={currency} value={currency}>
          {currency}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
