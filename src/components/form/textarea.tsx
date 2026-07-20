import type { ComponentProps } from "react";

import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { Textarea as UITextarea } from "#/components/ui/textarea";
import { useFieldContext } from "#/integrations/tanstack-form";

type Props = {
  label: string;
} & ComponentProps<"textarea">;

export default function Textarea({ label, ...rest }: Props) {
  const field = useFieldContext<ComponentProps<"textarea">["value"]>();

  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const id = field.name;
  const errorId = `${id}-error`;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>

      <UITextarea
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
