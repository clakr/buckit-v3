import type { ComponentProps, ReactNode } from "react";

import { IconLock } from "@tabler/icons-react";
import { useId } from "react";

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
  currency: string | null | undefined;
  locked?: boolean;
  description?: ReactNode;
} & Omit<ComponentProps<typeof InputGroupInput>, "type" | "id" | "value" | "onChange" | "onBlur">;

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

  const id = useId();
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
          aria-describedby={
            [description ? descriptionId : null, isInvalid ? errorId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
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
