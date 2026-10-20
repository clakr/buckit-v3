import type { ComponentProps } from "react";

import { useId } from "react";

import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import {
  Select as UISelect,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { useFieldContext } from "#/integrations/tanstack-form";

type Props = {
  label: string;
  placeholder?: string;
  options: { label: string; value: string }[];
} & Omit<ComponentProps<typeof UISelect>, "value" | "onValueChange">;

export default function Select({ label, placeholder, options, ...rest }: Props) {
  const field = useFieldContext<string>();

  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const id = useId();
  const errorId = `${id}-error`;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>

      <UISelect
        {...rest}
        name={field.name}
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value as string)}
      >
        <SelectTrigger
          id={id}
          className="w-full"
          onBlur={field.handleBlur}
          aria-invalid={isInvalid ? true : undefined}
          aria-describedby={isInvalid ? errorId : undefined}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </UISelect>

      {isInvalid && <FieldError id={errorId} errors={field.state.meta.errors} />}
    </Field>
  );
}
