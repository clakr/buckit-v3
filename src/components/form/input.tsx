import type { ComponentProps } from "react";

import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { Input as UIInput } from "#/components/ui/input";
import { useFieldContext } from "#/integrations/tanstack-form";

type Props = {
  label: string;
} & ComponentProps<"input">;

export default function Input({ label, ...rest }: Props) {
  const field = useFieldContext<ComponentProps<"input">["value"]>();

  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const id = field.name;
  const errorId = `${id}-error`;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <UIInput
        type="text"
        {...rest}
        id={id}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={isInvalid ? true : undefined}
        aria-labelledby={isInvalid ? errorId : undefined}
      />
      {isInvalid && <FieldError id={errorId} errors={field.state.meta.errors} />}
    </Field>
  );
}
