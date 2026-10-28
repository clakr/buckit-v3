import { useSelector } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useImperativeHandle, useRef, type Ref } from "react";
import z from "zod";

import { Button } from "#/components/ui/button";
import {
  createDrawerHandle,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  ResponsiveDrawer,
  type DrawerChangeEventDetails,
} from "#/components/ui/drawer";
import { FieldError, FieldGroup } from "#/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "#/components/ui/input-group";
import { useAppForm } from "#/integrations/tanstack-form";
import { refineNameAvailability } from "#/lib/name-availability";
import { getCurrency, isCurrencyCode } from "#/lib/utils";
import { BankAccountSelectField } from "#/modules/bank-accounts/components/bank-account-select-field";
import { bankAccountsQueryOption } from "#/modules/bank-accounts/query-options";
import { bucketsQueryOptions } from "#/modules/buckets/query-options";
import { DistributionLinesField } from "#/modules/distributions/components/distribution-lines-field";
import { SplitSummary } from "#/modules/distributions/components/split-summary";
import { validateDistributionName } from "#/modules/distributions/functions";
import { useCreateDistributionMutation } from "#/modules/distributions/mutations";
import { createDistributionSchema } from "#/modules/distributions/schemas";
import {
  draftsToPlanLines,
  toCents,
  type DistributionLineDraft,
} from "#/modules/distributions/utils";
import { confirm } from "#/stores/use-confirm";

export const createDistributionDrawerHandle = createDrawerHandle();

const FALLBACK_CURRENCY = "PHP";

type CreateDistributionFormControls = {
  isDirty: () => boolean;
  reset: () => void;
};

export function CreateDistributionDrawer() {
  const formControlsRef = useRef<CreateDistributionFormControls>(null);

  async function handleOnOpenChange(open: boolean, eventDetails: DrawerChangeEventDetails) {
    if (open || !formControlsRef.current?.isDirty()) return;

    eventDetails.cancel();

    const confirmed = await confirm("Discard new distribution?", {
      description: "The distribution details you entered will be lost.",
      confirmLabel: "Keep Editing",
      cancelLabel: "Discard",
      dismissValue: true,
    });

    if (confirmed) return;

    formControlsRef.current.reset();
    createDistributionDrawerHandle.close();
  }

  return (
    <ResponsiveDrawer handle={createDistributionDrawerHandle} onOpenChange={handleOnOpenChange}>
      <DrawerContent>
        <CreateDistributionForm
          onCreate={() => createDistributionDrawerHandle.close()}
          ref={formControlsRef}
        />
      </DrawerContent>
    </ResponsiveDrawer>
  );
}

function CreateDistributionForm({
  onCreate,
  ref,
}: {
  onCreate: () => void;
  ref: Ref<CreateDistributionFormControls>;
}) {
  const mutation = useCreateDistributionMutation();

  const bucketsQuery = useQuery(bucketsQueryOptions);
  const bankAccountsQuery = useQuery(bankAccountsQueryOption());

  const defaultValues: z.input<typeof createDistributionSchema> = {
    name: "",
    bankAccountId: "",
    amount: "",
    lines: [],
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: createDistributionSchema,
    },
    onSubmit: async ({ value: data }) => {
      try {
        await mutation.mutateAsync({ data });
      } catch (error) {
        console.error(error);

        return;
      }

      form.reset();
      onCreate();
    },
  });

  useImperativeHandle(
    ref,
    () => ({ isDirty: () => form.state.isDirty, reset: () => form.reset() }),
    [form],
  );

  const bankAccountId = useSelector(form.store, (state) => state.values.bankAccountId);
  const amount = useSelector(form.store, (state) => state.values.amount);
  const lines = useSelector(form.store, (state) => state.values.lines) as DistributionLineDraft[];

  const bankAccount = bankAccountsQuery.data?.find((account) => account.id === bankAccountId);
  const currency = bankAccount?.currency ?? FALLBACK_CURRENCY;
  const currencySymbol =
    (isCurrencyCode(currency) ? getCurrency(currency)?.symbol : undefined) ?? currency;

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Create Distribution</DrawerTitle>
        <DrawerDescription>Save a routine you can trigger each payday.</DrawerDescription>
      </DrawerHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <form
          id={form.formId}
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.AppField
              name="name"
              validators={{
                onChangeAsyncDebounceMs: 500,
                onChangeAsync: createDistributionSchema.shape.name.superRefine(
                  refineNameAvailability((name) => validateDistributionName({ data: { name } })),
                ),
              }}
            >
              {(field) => (
                <field.ValidatedInput label="Name" placeholder="Payday" maxLength={100} />
              )}
            </form.AppField>
            <form.AppField name="bankAccountId">
              {() => (
                <BankAccountSelectField
                  label="Bank Account"
                  description="The account every record goes into. It can't be changed once saved."
                  placeholder="Select bank account"
                  currency={null}
                  bankAccountsQuery={bankAccountsQuery}
                  bankAccounts={bankAccountsQuery.data}
                  emptyContent={<FieldError>Register a bank account first.</FieldError>}
                />
              )}
            </form.AppField>
            <form.AppField name="amount">
              {(field) => (
                <field.AmountInput
                  label="Default Amount"
                  currency={bankAccount?.currency}
                  placeholder="0.00"
                  min={0.01}
                  step={0.01}
                  required
                />
              )}
            </form.AppField>
            <form.Field name="lines" mode="array">
              {(linesField) => (
                <DistributionLinesField
                  lines={linesField.state.value as DistributionLineDraft[]}
                  buckets={bucketsQuery.data ?? []}
                  currency={currency}
                  amountCents={toCents(String(amount ?? ""))}
                  errors={
                    linesField.state.meta.isTouched
                      ? (linesField.state.meta.errors as { message?: string }[])
                      : []
                  }
                  onSelectBuckets={(bucketIds) =>
                    linesField.handleChange(
                      bucketIds.map(
                        (bucketId) =>
                          linesField.state.value.find((line) => line.bucketId === bucketId) ?? {
                            bucketId,
                            mode: "percent" as const,
                            value: "10",
                          },
                      ),
                    )
                  }
                  onChangeMode={(index, mode) =>
                    linesField.replaceValue(index, {
                      bucketId: linesField.state.value[index].bucketId,
                      mode,
                      value: mode === "percent" ? "10" : "",
                    })
                  }
                  onRemove={(index) => linesField.removeValue(index)}
                  renderValueInput={(index) => (
                    <form.AppField name={`lines[${index}].value`}>
                      {(field) => {
                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                        const isPercent = lines[index]?.mode === "percent";

                        return (
                          <div className="flex min-w-0 flex-1 flex-col gap-y-1">
                            <InputGroup>
                              {isPercent ? null : (
                                <InputGroupAddon>
                                  <InputGroupText>{currencySymbol}</InputGroupText>
                                </InputGroupAddon>
                              )}
                              <InputGroupInput
                                type="number"
                                aria-label="Line value"
                                min={0}
                                step={isPercent ? 0.5 : 0.01}
                                placeholder={isPercent ? "0" : "0.00"}
                                value={String(field.state.value ?? "")}
                                onChange={(e) => field.handleChange(e.target.value)}
                                onBlur={field.handleBlur}
                                aria-invalid={isInvalid ? true : undefined}
                              />
                              {isPercent ? (
                                <InputGroupAddon align="inline-end">
                                  <InputGroupText>%</InputGroupText>
                                </InputGroupAddon>
                              ) : null}
                            </InputGroup>
                            {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                          </div>
                        );
                      }}
                    </form.AppField>
                  )}
                />
              )}
            </form.Field>
            <SplitSummary
              lines={draftsToPlanLines(lines)}
              amountCents={toCents(String(amount ?? ""))}
              currency={currency}
            />
          </FieldGroup>
        </form>
      </div>
      <DrawerFooter className="border-t pt-4">
        <form.AppForm>
          <form.Button form={form.formId}>Create Distribution</form.Button>
        </form.AppForm>
        <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
      </DrawerFooter>
    </>
  );
}
