import type { ReactNode } from "react";

import { IconLock } from "@tabler/icons-react";

import { Field, FieldDescription, FieldError, FieldLabel } from "#/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "#/components/ui/input-group";
import { Spinner } from "#/components/ui/spinner";
import { useFieldContext } from "#/integrations/tanstack-form";
import { getCurrency, isCurrencyCode } from "#/lib/utils";

type Props = {
  label: string;
  /** The currency code the amount is in; unknown or not yet chosen shows a placeholder. */
  currency: string | null | undefined;
  /** Not usable yet, e.g. until an account is picked. */
  disabled?: boolean;
  /** Fixed for good: disabled, with a lock in place of the currency symbol. Say why in `description`. */
  locked?: boolean;
  description?: ReactNode;
};

// A money amount in one currency: symbol, number input, code. Shows a spinner in place of the code
// while an async validator runs.
export default function AmountInput({ label, currency, disabled, locked, description }: Props) {
  const field = useFieldContext<string | number>();

  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const id = field.name;
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;

  const known = currency && isCurrencyCode(currency) ? getCurrency(currency) : undefined;

  return (
    <Field data-invalid={isInvalid} data-disabled={locked || disabled}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>

      <InputGroup>
        <InputGroupAddon>
          {locked ? <IconLock /> : <InputGroupText>{known?.symbol ?? "—"}</InputGroupText>}
        </InputGroupAddon>
        <InputGroupInput
          type="number"
          id={id}
          placeholder="0.00"
          min={0}
          step={0.01}
          required
          disabled={locked || disabled}
          value={field.state.value}
          onChange={(e) => field.handleChange(e.target.value)}
          onBlur={field.handleBlur}
          aria-invalid={isInvalid ? true : undefined}
          aria-labelledby={isInvalid ? errorId : undefined}
          aria-describedby={description ? descriptionId : undefined}
        />
        <InputGroupAddon align="inline-end">
          {field.state.meta.isValidating ? (
            <Spinner />
          ) : (
            <InputGroupText>{known?.code ?? currency ?? ""}</InputGroupText>
          )}
        </InputGroupAddon>
      </InputGroup>

      {description ? <FieldDescription id={descriptionId}>{description}</FieldDescription> : null}

      {isInvalid && <FieldError id={errorId} errors={field.state.meta.errors} />}
    </Field>
  );
}
