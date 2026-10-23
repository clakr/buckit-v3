import { useSelector } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useImperativeHandle, useRef, type Ref } from "react";
import z from "zod";

import { CurrencyCombobox } from "#/components/currency-combobox";
import { Button } from "#/components/ui/button";
import {
  createDrawerHandle,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  type DrawerChangeEventDetails,
} from "#/components/ui/drawer";
import { Field, FieldError, FieldGroup, FieldLabel } from "#/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/ui/input-group";
import { useIsMobile } from "#/hooks/use-mobile";
import { useAppForm } from "#/integrations/tanstack-form";
import { exceedsAvailable, describeInsufficientUnallocated } from "#/lib/money";
import { BankAccountSelectField } from "#/modules/bank-accounts/components/bank-account-select-field";
import { useRegisterBankAccountDialogStore } from "#/modules/bank-accounts/components/register-bank-account-dialog";
import { bankAccountsQueryOption } from "#/modules/bank-accounts/query-options";
import { useRecordDebtMutation } from "#/modules/debts/mutations";
import { confirm } from "#/stores/use-confirm";

import { debtDirectionEnum, recordDebtSchema } from "../schemas";

export const recordDebtDrawerHandle = createDrawerHandle();

type RecordDebtFormControls = {
  isDirty: () => boolean;
  reset: () => void;
};

export function RecordDebtDrawer() {
  const isMobile = useIsMobile();

  const formControlsRef = useRef<RecordDebtFormControls>(null);

  async function handleOnOpenChange(open: boolean, eventDetails: DrawerChangeEventDetails) {
    if (open || !formControlsRef.current?.isDirty()) return;

    eventDetails.cancel();

    const confirmed = await confirm("Discard new debt?", {
      description: "The debt details you entered will be lost.",
      confirmLabel: "Keep Editing",
      cancelLabel: "Discard",
      dismissValue: true,
    });

    if (confirmed) return;

    formControlsRef.current.reset();
    recordDebtDrawerHandle.close();
  }

  return (
    <Drawer
      handle={recordDebtDrawerHandle}
      onOpenChange={handleOnOpenChange}
      showSwipeHandle={isMobile}
      swipeDirection={isMobile ? "down" : "right"}
    >
      <DrawerContent>
        <RecordDebtForm ref={formControlsRef} />
      </DrawerContent>
    </Drawer>
  );
}

type RecordDebtFormProps = {
  ref: Ref<RecordDebtFormControls>;
};

function RecordDebtForm({ ref }: RecordDebtFormProps) {
  const mutation = useRecordDebtMutation();

  const defaultValues: z.input<typeof recordDebtSchema> = {
    name: "",
    direction: "receivable",
    currency: "PHP",
    amount: 0,
    date: new Date(),
    note: "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: recordDebtSchema,
    },
    onSubmit: async ({ value: data }) => {
      try {
        await mutation.mutateAsync({ data });
      } catch (error) {
        console.error(error);

        return;
      }

      form.reset();
      recordDebtDrawerHandle.close();
    },
  });

  const currency = useSelector(form.store, (state) => state.values.currency);
  const direction = useSelector(form.store, (state) => state.values.direction);

  const bankAccountsQuery = useQuery({
    ...bankAccountsQueryOption({ currency }),
    enabled: direction === "receivable",
  });

  const eligibleSourceAccounts = bankAccountsQuery.data?.filter(
    (account) => account.unallocated > 0,
  );

  function openRegisterBankAccountDialog() {
    useRegisterBankAccountDialogStore.getState().open({ currency });
  }

  function findSourceAccount(bankAccountId: string | undefined) {
    return bankAccountsQuery.data?.find((account) => account.id === bankAccountId);
  }

  useImperativeHandle(
    ref,
    () => ({ isDirty: () => form.state.isDirty, reset: () => form.reset() }),
    [form],
  );

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Record Debt</DrawerTitle>
        <DrawerDescription>Track money you owe someone, or that they owe you.</DrawerDescription>
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
              name="direction"
              listeners={{
                onChange: ({ value }) => {
                  if (value === "receivable") return;

                  form.setFieldValue("bankAccountId", undefined);
                },
              }}
            >
              {(field) => (
                <field.RadioGroup
                  label="Direction"
                  options={Object.keys(debtDirectionEnum.enum).map((type) => ({
                    label: type,
                    value: type,
                  }))}
                />
              )}
            </form.AppField>
            <form.AppField name="name">
              {(field) => <field.Input label="Counterparty Name" placeholder="John" required />}
            </form.AppField>
            <Field>
              <FieldLabel htmlFor={`${form.formId}-amount`}>Amount</FieldLabel>

              <InputGroup>
                <InputGroupAddon>
                  <form.AppField name="currency">
                    {(field) => (
                      <CurrencyCombobox
                        value={field.state.value}
                        onValueChange={(value) => {
                          field.handleChange(value?.toString() ?? "");
                          form.setFieldValue("bankAccountId", undefined);
                        }}
                      />
                    )}
                  </form.AppField>
                </InputGroupAddon>
                <form.AppField
                  name="amount"
                  validators={{
                    onChangeListenTo: ["bankAccountId"],
                    onChange: ({ value }) => {
                      const bankAccount = findSourceAccount(form.getFieldValue("bankAccountId"));
                      if (!bankAccount) return undefined;

                      return exceedsAvailable(value, bankAccount.unallocated)
                        ? {
                            message: describeInsufficientUnallocated({
                              purpose: "loan",
                              bankAccount,
                              availableCents: bankAccount.unallocated,
                            }),
                          }
                        : undefined;
                    },
                  }}
                >
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                    return (
                      <InputGroupInput
                        type="number"
                        id={`${form.formId}-amount`}
                        placeholder="0.00"
                        min={0.01}
                        step={0.01}
                        required
                        value={field.state.value as string}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        aria-invalid={isInvalid ? true : undefined}
                        aria-describedby={isInvalid ? `${form.formId}-amount-error` : undefined}
                      />
                    );
                  }}
                </form.AppField>
              </InputGroup>
              <form.Subscribe
                selector={(state) =>
                  state.fieldMeta.amount?.isTouched ? state.fieldMeta.amount.errors : undefined
                }
              >
                {(amountErrors) => (
                  <FieldError id={`${form.formId}-amount-error`} errors={amountErrors} />
                )}
              </form.Subscribe>
            </Field>
            {direction === "receivable" ? (
              <form.AppField name="bankAccountId">
                {() => (
                  <BankAccountSelectField
                    label="Funding Source"
                    description="Optional. Leave it empty if the money isn't coming out of a tracked account."
                    placeholder="No source account"
                    currency={currency}
                    bankAccountsQuery={bankAccountsQuery}
                    bankAccounts={eligibleSourceAccounts}
                    emptyContent={
                      <>
                        <FieldError>No {currency} accounts with available balance.</FieldError>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={openRegisterBankAccountDialog}
                        >
                          Register a/an {currency} account
                        </Button>
                      </>
                    }
                  />
                )}
              </form.AppField>
            ) : (
              <p className="text-muted-foreground">
                No account needed yet. This debt is an IOU until you log a repayment.
              </p>
            )}
            <form.AppField name="date">
              {(field) => <field.Datepicker label="Date" />}
            </form.AppField>
            <form.AppField name="note">
              {(field) => <field.Textarea label="Note (optional)" placeholder="Add a note..." />}
            </form.AppField>
          </FieldGroup>
        </form>
      </div>
      <DrawerFooter className="border-t pt-4">
        <form.AppForm>
          <form.Button form={form.formId}>Record Debt</form.Button>
        </form.AppForm>
        <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
      </DrawerFooter>
    </>
  );
}
