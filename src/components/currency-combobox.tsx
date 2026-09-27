import type { ComponentProps } from "react";

import type { Currency } from "#/lib/types";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "#/components/ui/combobox";
import { InputGroupButton } from "#/components/ui/input-group";
import { CURRENCIES } from "#/lib/constants";

type Props = Omit<ComponentProps<typeof Combobox>, "items">;

export function CurrencyCombobox(props: Props) {
  return (
    <Combobox items={CURRENCIES} {...props}>
      <ComboboxTrigger
        render={
          <InputGroupButton>
            <ComboboxValue />
          </InputGroupButton>
        }
      />
      <ComboboxContent className="w-fit">
        <ComboboxInput showTrigger={false} placeholder="Search currencies..." />
        <ComboboxEmpty>No currencies found.</ComboboxEmpty>
        <ComboboxList>
          {(currency: Currency) => (
            <ComboboxItem key={currency.code} value={currency.code}>
              <span>{currency.flag}</span>
              <span>{currency.code}</span>
              <span>{currency.name}</span>
              <span className="grow text-end">{currency.symbol}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
