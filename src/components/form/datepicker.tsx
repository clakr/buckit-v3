import type { ComponentProps } from "react";

import { IconCalendar } from "@tabler/icons-react";
import { format } from "date-fns";
import { useId } from "react";

import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { useFieldContext } from "#/integrations/tanstack-form";

type Props = {
  label: string;
  /** Days that can't be picked, e.g. `{ before: debt.date }`. */
  disabled?: ComponentProps<typeof Calendar>["disabled"];
};

export default function Datepicker({ label, disabled }: Props) {
  const field = useFieldContext<Date>();

  const date = field.state.value;

  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  // Not `field.name`: two forms open at once (e.g. Register Account over Record Debt) share names.
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>

      <Popover>
        <PopoverTrigger
          render={
            <Button
              id={id}
              variant="outline"
              data-empty={!date}
              className="justify-start text-left font-normal data-[empty=true]:text-muted-foreground"
              aria-invalid={isInvalid ? true : undefined}
              aria-describedby={isInvalid ? errorId : undefined}
            />
          }
        >
          <IconCalendar />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            disabled={disabled}
            onSelect={(value) => field.handleChange(value ?? new Date())}
            onDayBlur={field.handleBlur}
          />
        </PopoverContent>
      </Popover>

      {isInvalid && <FieldError id={errorId} errors={field.state.meta.errors} />}
    </Field>
  );
}
