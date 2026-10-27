import { useSelector } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useImperativeHandle, useRef, type Ref, type RefObject } from "react";
import z from "zod";

import type { BankAccount, Bucket } from "#/db/schema";

import { StateTemplate } from "#/components/state-template";
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
import { useAppForm } from "#/integrations/tanstack-form";
import { formatMoney, exceedsAvailable, describeInsufficientUnallocated } from "#/lib/money";
import { getCurrency, isCurrencyCode } from "#/lib/utils";
import { useLogAllocationMutation } from "#/modules/allocations/mutations";
import { logAllocationSchema } from "#/modules/allocations/schemas";
import { BankAccountSelectField } from "#/modules/bank-accounts/components/bank-account-select-field";
import {
  NestedRegisterBankAccountDrawer,
  type RegisterBankAccountDrawerPayload,
} from "#/modules/bank-accounts/components/register-bank-account-drawer";
import { bankAccountsQueryOption } from "#/modules/bank-accounts/query-options";
import { NestedSetUpBucketDrawer } from "#/modules/buckets/components/set-up-bucket-drawer";
import { bucketsQueryOptions } from "#/modules/buckets/query-options";
import { confirm } from "#/stores/use-confirm";

export type LogAllocationStart =
  | { from: "bank-account"; bankAccountId: BankAccount["id"] }
  | { from: "bucket"; bucketId: Bucket["id"] };

export const logAllocationDrawerHandle = createDrawerHandle<{ start: LogAllocationStart }>();

const nestedSetUpBucketDrawerHandle = createDrawerHandle();

const nestedRegisterBankAccountDrawerHandle =
  createDrawerHandle<RegisterBankAccountDrawerPayload>();

type LogAllocationFormControls = {
  isDirty: () => boolean;
  reset: () => void;
};

export function LogAllocationDrawer() {
  const formControlsRef = useRef<LogAllocationFormControls>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const setUpBucketButtonRef = useRef<HTMLButtonElement>(null);
  const registerButtonRef = useRef<HTMLButtonElement>(null);

  async function handleOnOpenChange(open: boolean, eventDetails: DrawerChangeEventDetails) {
    if (open || !formControlsRef.current?.isDirty()) return;

    eventDetails.cancel();

    const confirmed = await confirm("Discard new allocation?", {
      description: "The allocation details you entered will be lost.",
      confirmLabel: "Keep Editing",
      cancelLabel: "Discard",
      dismissValue: true,
    });

    if (confirmed) return;

    formControlsRef.current.reset();
    logAllocationDrawerHandle.close();
  }

  return (
    <ResponsiveDrawer handle={logAllocationDrawerHandle} onOpenChange={handleOnOpenChange}>
      {({ payload }) => (
        <>
          <DrawerContent ref={popupRef}>
            {payload ? (
              <LogAllocationForm
                start={payload.start}
                setUpBucketButtonRef={setUpBucketButtonRef}
                registerButtonRef={registerButtonRef}
                ref={formControlsRef}
              />
            ) : null}
          </DrawerContent>
          <NestedSetUpBucketDrawer
            handle={nestedSetUpBucketDrawerHandle}
            finalFocus={() => setUpBucketButtonRef.current ?? popupRef.current}
          />
          <NestedRegisterBankAccountDrawer
            handle={nestedRegisterBankAccountDrawerHandle}
            finalFocus={() => registerButtonRef.current ?? popupRef.current}
          />
        </>
      )}
    </ResponsiveDrawer>
  );
}

type LogAllocationFormProps = {
  start: LogAllocationStart;
  setUpBucketButtonRef: RefObject<HTMLButtonElement | null>;
  registerButtonRef: RefObject<HTMLButtonElement | null>;
  ref: Ref<LogAllocationFormControls>;
};

function LogAllocationForm({
  start,
  setUpBucketButtonRef,
  registerButtonRef,
  ref,
}: LogAllocationFormProps) {
  const mutation = useLogAllocationMutation();

  const defaultValues: z.input<typeof logAllocationSchema> = {
    bankAccountId: start.from === "bank-account" ? start.bankAccountId : "",
    bucketId: start.from === "bucket" ? start.bucketId : "",
    amount: 0,
    date: new Date(),
    note: "",
  };

  const {
    status: bucketsStatus,
    refetch: refetchBuckets,
    data: buckets,
  } = useQuery(bucketsQueryOptions);

  const {
    status: bankAccountsStatus,
    refetch: refetchBankAccounts,
    data: bankAccounts,
  } = useQuery(bankAccountsQueryOption());

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: logAllocationSchema,
    },
    onSubmit: async ({ value: data }) => {
      try {
        await mutation.mutateAsync({ data });
      } catch (error) {
        console.error(error);

        return;
      }

      form.reset();
      logAllocationDrawerHandle.close();
    },
  });

  useImperativeHandle(
    ref,
    () => ({ isDirty: () => form.state.isDirty, reset: () => form.reset() }),
    [form],
  );

  const bankAccountId = useSelector(form.store, (state) => state.values.bankAccountId);
  const bucketId = useSelector(form.store, (state) => state.values.bucketId);

  function findBankAccount(id: string) {
    return bankAccounts?.find((a) => a.id === id);
  }

  const fixedName =
    start.from === "bank-account"
      ? findBankAccount(start.bankAccountId)?.name
      : buckets?.find((b) => b.id === start.bucketId)?.name;

  const selectedBankAccount = findBankAccount(bankAccountId);

  const currencyCode = selectedBankAccount?.currency;
  const currency = currencyCode && isCurrencyCode(currencyCode) ? getCurrency(currencyCode) : null;

  const unallocated = selectedBankAccount?.unallocated ?? null;

  const isAmountDisabled = !bankAccountId || !bucketId;

  const isPending = bankAccountsStatus === "pending" || bucketsStatus === "pending";

  const loadError =
    bankAccountsStatus === "error"
      ? { noun: "bank accounts", retry: refetchBankAccounts }
      : bucketsStatus === "error"
        ? { noun: "buckets", retry: refetchBuckets }
        : null;

  const isLoaded = bankAccountsStatus === "success" && bucketsStatus === "success";

  const isFixedSideGone = isLoaded && fixedName === undefined;

  const isReady = isLoaded && !isFixedSideGone;

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Allocate Money</DrawerTitle>
        {isReady ? (
          <DrawerDescription>
            {start.from === "bank-account"
              ? `Move money from ${fixedName} into a bucket.`
              : `Move money into ${fixedName} from a bank account.`}
          </DrawerDescription>
        ) : null}
      </DrawerHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {isPending && !loadError ? (
          <StateTemplate
            state="loading"
            title="Loading"
            description="Fetching your bank accounts and buckets..."
          />
        ) : null}
        {loadError ? (
          <StateTemplate
            state="error"
            title={`Could not load ${loadError.noun}`}
            description={`We weren't able to retrieve your ${loadError.noun}. Please check your connection and try again.`}
            content={<Button onClick={() => loadError.retry()}>Retry</Button>}
          />
        ) : null}
        {isFixedSideGone ? (
          <StateTemplate
            state="error"
            title={start.from === "bank-account" ? "Bank account not found" : "Bucket not found"}
            description={
              start.from === "bank-account"
                ? "This account doesn't exist or may have been deleted."
                : "This bucket doesn't exist or may have been deleted."
            }
            content={<DrawerClose render={<Button variant="secondary" />}>Close</DrawerClose>}
          />
        ) : null}
        {isReady ? (
          <form
            id={form.formId}
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              {start.from === "bucket" ? (
                <form.AppField name="bankAccountId">
                  {() => (
                    <BankAccountSelectField
                      label="Bank Account"
                      description={null}
                      placeholder="Select bank account"
                      currency={null}
                      bankAccountsQuery={{
                        status: bankAccountsStatus,
                        refetch: refetchBankAccounts,
                      }}
                      bankAccounts={bankAccounts}
                      emptyContent={
                        <>
                          <p className="text-muted-foreground">
                            You have no bank accounts to allocate from yet.
                          </p>
                          <DrawerTrigger
                            ref={registerButtonRef}
                            handle={nestedRegisterBankAccountDrawerHandle}
                            payload={{ currency: "PHP" }}
                            render={<Button type="button" variant="outline" />}
                          >
                            Register Bank Account
                          </DrawerTrigger>
                        </>
                      }
                    />
                  )}
                </form.AppField>
              ) : null}
              <form.AppField
                name="amount"
                validators={{
                  onChangeListenTo: ["bankAccountId"],
                  onChange: ({ value }) => {
                    const bankAccount = findBankAccount(form.getFieldValue("bankAccountId"));
                    if (!bankAccount) return undefined;

                    return exceedsAvailable(value, bankAccount.unallocated)
                      ? {
                          message: describeInsufficientUnallocated({
                            bankAccount,
                            availableCents: bankAccount.unallocated,
                          }),
                        }
                      : undefined;
                  },
                }}
              >
                {(field) => (
                  <field.AmountInput
                    label="Amount"
                    min={0.01}
                    step={0.01}
                    required
                    placeholder="0.00"
                    currency={currencyCode}
                    disabled={isAmountDisabled || !currency}
                    description={
                      currency && unallocated !== null ? (
                        <>
                          Available:{" "}
                          <span className="font-semibold">
                            {formatMoney(unallocated, currency.code)}
                          </span>
                        </>
                      ) : undefined
                    }
                  />
                )}
              </form.AppField>
              {start.from === "bank-account" ? (
                <form.AppField name="bucketId">
                  {(field) => {
                    const options = buckets?.map((b) => ({ value: b.id, label: b.name })) ?? [];

                    if (!options.length) {
                      const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel>Bucket</FieldLabel>
                          <p className="text-muted-foreground">
                            You have no buckets to allocate into yet.
                          </p>
                          <DrawerTrigger
                            ref={setUpBucketButtonRef}
                            handle={nestedSetUpBucketDrawerHandle}
                            render={<Button type="button" variant="outline" />}
                          >
                            Set Up Bucket
                          </DrawerTrigger>
                          {isInvalid && <FieldError errors={field.state.meta.errors} />}
                        </Field>
                      );
                    }

                    return (
                      <field.Select
                        label="Bucket"
                        items={options}
                        placeholder="Select bucket"
                        options={options}
                      />
                    );
                  }}
                </form.AppField>
              ) : null}
              <form.AppField name="date">
                {(field) => <field.Datepicker label="Date" />}
              </form.AppField>
              <form.AppField name="note">
                {(field) => <field.Textarea label="Note (optional)" placeholder="Add a note..." />}
              </form.AppField>
            </FieldGroup>
          </form>
        ) : null}
      </div>
      {isReady ? (
        <DrawerFooter className="border-t pt-4">
          <form.AppForm>
            <form.Button form={form.formId}>Allocate Money</form.Button>
          </form.AppForm>
          <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
        </DrawerFooter>
      ) : null}
    </>
  );
}
