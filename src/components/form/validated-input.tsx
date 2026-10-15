import type { ComponentProps } from "react";

import { IconCheck, IconExclamationCircle } from "@tabler/icons-react";

import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/ui/input-group";
import { Spinner } from "#/components/ui/spinner";
import { useFieldContext } from "#/integrations/tanstack-form";

type Props = {
  label: string;
} & ComponentProps<"input">;

// A text input that shows its validation status once touched: a spinner while an async
// validator runs, then a check or an error icon.
export default function ValidatedInput({ label, ...rest }: Props) {
  const field = useFieldContext<string>();

  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const id = field.name;
  const errorId = `${id}-error`;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>

      <InputGroup>
        <InputGroupInput
          type="text"
          {...rest}
          id={id}
          value={field.state.value}
          onChange={(e) => field.handleChange(e.target.value)}
          onBlur={field.handleBlur}
          aria-invalid={isInvalid ? true : undefined}
          aria-labelledby={isInvalid ? errorId : undefined}
        />
        {field.state.meta.isTouched ? (
          <InputGroupAddon align="inline-end">
            {field.state.meta.isValidating ? (
              <Spinner />
            ) : field.state.meta.isValid ? (
              <IconCheck />
            ) : (
              <IconExclamationCircle />
            )}
          </InputGroupAddon>
        ) : null}
      </InputGroup>
      {isInvalid && <FieldError id={errorId} errors={field.state.meta.errors} />}
    </Field>
  );
}
