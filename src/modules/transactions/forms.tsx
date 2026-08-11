import { IconCalendar } from "@tabler/icons-react";
import { createFieldMap } from "@tanstack/react-form";
import { format } from "date-fns";
import { z } from "zod";

import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Field, FieldError, FieldGroup, FieldLabel } from "#/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "#/components/ui/input-group";
import { Label } from "#/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "#/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import { withFieldGroup } from "#/integrations/tanstack-form";
import { getCurrency, isCurrencyCode } from "#/lib/utils";

import { baseTransactionSchema, transactionTypeEnum } from "./schema";

export const baseTransactionDefaultValues: z.input<typeof baseTransactionSchema> = {
  type: "income",
  amount: 0,
  date: new Date(),
  note: "",
};

export const baseTransactionFields = createFieldMap(baseTransactionDefaultValues);

export const BaseTransactionFieldGroup = withFieldGroup({
  defaultValues: baseTransactionDefaultValues,
  props: {
    currency: "php",
  },
  render: function Render({ group, currency: accountCurrency }) {
    return (
      <FieldGroup>
        <group.AppField name="type">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

            const id = field.name;
            const errorId = `${id}-error`;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={id}>Type</FieldLabel>

                <RadioGroup
                  id={id}
                  value={field.state.value}
                  onValueChange={field.handleChange}
                  onBlur={field.handleBlur}
                  aria-invalid={isInvalid ? true : undefined}
                  aria-labelledby={isInvalid ? errorId : undefined}
                >
                  {Object.keys(transactionTypeEnum.enum).map((type) => (
                    <div key={type} className="flex items-center gap-x-2">
                      <RadioGroupItem value={type} id={type} />
                      <Label htmlFor={type} className="capitalize">
                        {type}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {isInvalid && <FieldError id={errorId} errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </group.AppField>
        <group.AppField name="amount">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

            const id = field.name;
            const errorId = `${id}-error`;

            const validated = isCurrencyCode(accountCurrency);
            if (!validated) return null;

            const currency = getCurrency(accountCurrency);
            if (!currency) return null;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={id}>Amount</FieldLabel>

                <InputGroup>
                  <InputGroupAddon>
                    <InputGroupText>{currency.symbol}</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    type="number"
                    id={field.name}
                    placeholder="0.00"
                    min={0}
                    step={0.01}
                    required
                    value={field.state.value as string}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={isInvalid ? true : undefined}
                    aria-labelledby={isInvalid ? "startingBalance-error" : undefined}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>{currency.code}</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>

                {isInvalid && <FieldError id={errorId} errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </group.AppField>
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
      </FieldGroup>
    );
  },
});
