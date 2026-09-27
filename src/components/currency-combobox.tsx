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
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "#/components/ui/item";
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
            <ComboboxItem key={currency.code} value={currency.code} className="pr-7">
              <Item size="xs" className="w-full p-0">
                <ItemMedia>{currency.flag}</ItemMedia>
                <ItemContent>
                  <ItemTitle className="whitespace-nowrap">{currency.code}</ItemTitle>
                  <ItemDescription className="line-clamp-1">
                    {currency.name} ({currency.symbol})
                  </ItemDescription>
                </ItemContent>
              </Item>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
