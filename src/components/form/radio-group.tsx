import type { ComponentProps } from "react";

import { useId } from "react";

import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { Label } from "#/components/ui/label";
import { RadioGroup as UIRadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import { useFieldContext } from "#/integrations/tanstack-form";

type Props = {
  label: string;
  options: { label: string; value: string }[];
} & ComponentProps<typeof UIRadioGroup>;

export default function RadioGroup({ label, options, ...rest }: Props) {
  const field = useFieldContext<string>();

  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  // Not `field.name`: two forms open at once (e.g. Register Account over Record Debt) share names.
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>

      <UIRadioGroup
        {...rest}
        id={id}
        value={field.state.value}
        onValueChange={field.handleChange}
        onBlur={field.handleBlur}
        aria-invalid={isInvalid ? true : undefined}
        aria-describedby={isInvalid ? errorId : undefined}
      >
        {options.map((option) => (
          <div key={option.value} className="flex items-center gap-x-2">
            <RadioGroupItem value={option.value} id={`${id}-${option.value}`} />
            <Label htmlFor={`${id}-${option.value}`} className="capitalize">
              {option.label}
            </Label>
          </div>
        ))}
      </UIRadioGroup>

      {isInvalid && <FieldError id={errorId} errors={field.state.meta.errors} />}
    </Field>
  );
}
