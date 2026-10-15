import type { ComponentProps, ReactNode } from "react";

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
  /** Fixed for good: disabled, with a lock in place of the currency symbol. Say why in `description`. */
  locked?: boolean;
  description?: ReactNode;
} & Omit<ComponentProps<typeof InputGroupInput>, "type" | "id" | "value" | "onChange" | "onBlur">;

// A money amount in one currency: symbol, number input, code. Shows a spinner in place of the code
// while an async validator runs. Any input prop passes through with no defaults of its own, so
// each caller states its `min`, `step` and `required` to match its schema.
export default function AmountInput({
  label,
  currency,
  locked,
  description,
  disabled,
  ...rest
}: Props) {
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
          {...rest}
          type="number"
          id={id}
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
