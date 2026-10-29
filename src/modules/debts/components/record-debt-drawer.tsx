import { useSelector } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useImperativeHandle, useRef, useState, type ComponentProps, type Ref, type RefObject } from "react";
import z from "zod";

import type { Debt } from "#/db/schema";

import { CurrencyCombobox } from "#/components/currency-combobox";
import { Button } from "#/components/ui/button";
import {
  createDrawerHandle,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  ResponsiveDrawer,
  type DrawerChangeEventDetails,
} from "#/components/ui/drawer";
import { Field, FieldError, FieldGroup, FieldLabel } from "#/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/ui/input-group";
import { useAppForm } from "#/integrations/tanstack-form";
import { exceedsAvailable, describeInsufficientUnallocated } from "#/lib/money";
import { BankAccountSelectField } from "#/modules/bank-accounts/components/bank-account-select-field";
import {
  NestedRegisterBankAccountDrawer,
  type RegisterBankAccountDrawerPayload,
} from "#/modules/bank-accounts/components/register-bank-account-drawer";
import { bankAccountsQueryOption } from "#/modules/bank-accounts/query-options";
import { useRecordDebtMutation } from "#/modules/debts/mutations";
import { confirm } from "#/stores/use-confirm";

import { debtDirectionEnum, recordDebtSchema } from "../schemas";

export type RecordDebtDrawerPayload = { currency: string };

type RecordDebtDrawerHandle = ReturnType<typeof createDrawerHandle<RecordDebtDrawerPayload>>;

export const recordDebtDrawerHandle = createDrawerHandle<RecordDebtDrawerPayload>();

type RecordDebtFormControls = {
  isDirty: () => boolean;
  reset: () => void;
};

export function RecordDebtDrawer() {
  return <RecordDebtDrawerRoot handle={recordDebtDrawerHandle} />;
}

type RecordDebtDrawerRootProps = {
  handle: RecordDebtDrawerHandle;
  finalFocus?: ComponentProps<typeof DrawerContent>["finalFocus"];
  onRecorded?: (debt: Debt) => void;
};

/**
 * Render beside a parent's `DrawerContent`, inside its Root, so Base UI nests it and the
 * parent's `Suspense` can't unmount it. Open it from a `DrawerTrigger` bound to the same
 * `handle` with a `{ currency }` payload, which locks the Debt's currency.
 */
export function NestedRecordDebtDrawer({
  handle,
  finalFocus,
  onRecorded,
}: RecordDebtDrawerRootProps) {
  return <RecordDebtDrawerRoot handle={handle} finalFocus={finalFocus} onRecorded={onRecorded} />;
}

function RecordDebtDrawerRoot({ handle, finalFocus, onRecorded }: RecordDebtDrawerRootProps) {
  const formControlsRef = useRef<RecordDebtFormControls>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const registerButtonRef = useRef<HTMLButtonElement>(null);

  // Per Root: the global and the Distribution-nested Record Debt each nest their own Register.
  const [nestedRegisterBankAccountDrawerHandle] = useState(() =>
    createDrawerHandle<RegisterBankAccountDrawerPayload>(),
  );

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
    handle.close();
  }

  return (
    <ResponsiveDrawer handle={handle} onOpenChange={handleOnOpenChange}>
      {({ payload }) => (
        <>
          <DrawerContent ref={popupRef} finalFocus={finalFocus}>
            <RecordDebtForm
              lockedCurrency={payload?.currency}
              onRecorded={(debt) => {
                handle.close();
                onRecorded?.(debt);
              }}
              nestedRegisterBankAccountDrawerHandle={nestedRegisterBankAccountDrawerHandle}
              registerButtonRef={registerButtonRef}
              ref={formControlsRef}
            />
          </DrawerContent>
          <NestedRegisterBankAccountDrawer
            handle={nestedRegisterBankAccountDrawerHandle}
            finalFocus={() => registerButtonRef.current ?? popupRef.current}
          />
        </>
      )}
    </ResponsiveDrawer>
  );
}

type RecordDebtFormProps = {
  /** Fixes the Debt's currency, so the User can't pick another one. */
  lockedCurrency?: string;
  onRecorded: (debt: Debt) => void;
  nestedRegisterBankAccountDrawerHandle: ReturnType<
    typeof createDrawerHandle<RegisterBankAccountDrawerPayload>
  >;
  registerButtonRef: RefObject<HTMLButtonElement | null>;
  ref: Ref<RecordDebtFormControls>;
};

function RecordDebtForm({
  lockedCurrency,
  onRecorded,
  nestedRegisterBankAccountDrawerHandle,
  registerButtonRef,
  ref,
}: RecordDebtFormProps) {
  const mutation = useRecordDebtMutation();

  const defaultValues: z.input<typeof recordDebtSchema> = {
    name: "",
    direction: "receivable",
    currency: lockedCurrency ?? "PHP",
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
      let debt: Debt;

      try {
        debt = await mutation.mutateAsync({ data });
      } catch (error) {
        console.error(error);

        return;
      }

      form.reset();
      onRecorded(debt);
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
                        disabled={lockedCurrency !== undefined}
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
                        <DrawerTrigger
                          ref={registerButtonRef}
                          handle={nestedRegisterBankAccountDrawerHandle}
                          payload={{ currency }}
                          render={<Button type="button" variant="outline" />}
                        >
                          Register a/an {currency} account
                        </DrawerTrigger>
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
