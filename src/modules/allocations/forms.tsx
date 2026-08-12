import { IconCalendar } from "@tabler/icons-react";
import { createFieldMap } from "@tanstack/react-form";
import { format } from "date-fns";
import { z } from "zod";

import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { withFieldGroup } from "#/integrations/tanstack-form";

import type { baseAllocationSchema } from "./schema";

export const baseAllocationDefaultValues: z.input<typeof baseAllocationSchema> = {
  date: new Date(),
  note: "",
};

export const baseAllocationFields = createFieldMap(baseAllocationDefaultValues);

export const BaseAllocationFieldGroup = withFieldGroup({
  defaultValues: baseAllocationDefaultValues,
  render: function Render({ group }) {
    return (
      <>
        <group.AppField name="date">
          {(field) => {
            const date = field.state.value;

            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

            const id = field.name;
            const errorId = `${id}-error`;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={id}>Date</FieldLabel>

                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        id={id}
                        variant="outline"
                        data-empty={!date}
                        className="justify-start text-left font-normal data-[empty=true]:text-muted-foreground"
                        aria-invalid={isInvalid ? true : undefined}
                        aria-labelledby={isInvalid ? errorId : undefined}
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
                      onSelect={(value) => field.handleChange(value ?? new Date())}
                      onDayBlur={field.handleBlur}
                    />
                  </PopoverContent>
                </Popover>

                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </group.AppField>
        <group.AppField name="note">
          {(field) => <field.Textarea label="Note (optional)" placeholder="Add a note..." />}
        </group.AppField>
      </>
    );
  },
});
