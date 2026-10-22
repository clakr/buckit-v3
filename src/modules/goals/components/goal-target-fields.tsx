import { IconCalendar, IconX } from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-form";
import { format, startOfToday } from "date-fns";
import { useId } from "react";
import z from "zod";

import type { BankAccount } from "#/db/schema";

import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Field, FieldDescription, FieldError, FieldLabel } from "#/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { useFieldContext, withFieldGroup } from "#/integrations/tanstack-form";
import { goalTargetSchema } from "#/modules/goals/schemas";

const defaultValues: z.input<typeof goalTargetSchema> = {
  targetAmount: 0,
  currency: "PHP",
  targetDate: null,
};

export const GoalTargetFields = withFieldGroup({
  defaultValues,
  props: {
    currencies: [] as BankAccount["currency"][],
  },
  render: function Render({ group, currencies }) {
    const currency = useSelector(group.store, (state) => state.values.currency);

    return (
      <>
        <group.AppField name="currency">
          {(field) => (
            <field.Select
              label="Currency"
              placeholder="Select currency"
              options={currencies.map((code) => ({ value: code, label: code }))}
            />
          )}
        </group.AppField>
        <group.AppField name="targetAmount">
          {(field) => (
            <field.AmountInput
              label="Target Amount"
              min={0.01}
              step={0.01}
              required
              placeholder="0.00"
              currency={currency}
            />
          )}
        </group.AppField>
        <group.AppField name="targetDate">{() => <GoalTargetDateField />}</group.AppField>
      </>
    );
  },
});

export function GoalTargetDateField() {
  const field = useFieldContext<Date | null>();

  const targetDate = field.state.value;
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const triggerId = useId();
  const errorId = `${triggerId}-error`;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={triggerId}>Target Date (optional)</FieldLabel>
      <div className="flex gap-x-2">
        <Popover>
          <PopoverTrigger
            render={
              <Button
                id={triggerId}
                variant="outline"
                data-empty={!targetDate}
                className="flex-1 justify-start text-left font-normal data-[empty=true]:text-muted-foreground"
                aria-invalid={isInvalid ? true : undefined}
                aria-describedby={isInvalid ? errorId : undefined}
              />
            }
          >
            <IconCalendar />
            {targetDate ? format(targetDate, "PPP") : <span>No target date</span>}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={targetDate ?? undefined}
              disabled={{ before: startOfToday() }}
              onSelect={(value) => field.handleChange(value ?? null)}
              onDayBlur={field.handleBlur}
            />
          </PopoverContent>
        </Popover>
        {targetDate ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Clear target date"
            onClick={() => field.handleChange(null)}
          >
            <IconX />
          </Button>
        ) : null}
      </div>
      <FieldDescription>Leave empty to save without a deadline.</FieldDescription>
      {isInvalid && <FieldError id={errorId} errors={field.state.meta.errors} />}
    </Field>
  );
}
