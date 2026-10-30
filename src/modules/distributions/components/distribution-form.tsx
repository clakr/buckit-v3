import { useSelector } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useImperativeHandle, useRef, type Ref } from "react";
import z from "zod";

import type { Debt } from "#/db/schema";
import type { DistributionNestedDrawers } from "#/modules/distributions/components/distribution-nested-drawers";

import { Button } from "#/components/ui/button";
import {
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "#/components/ui/drawer";
import { FieldError, FieldGroup } from "#/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "#/components/ui/input-group";
import { useAppForm } from "#/integrations/tanstack-form";
import { centsToAmountInput } from "#/lib/money";
import { refineNameAvailability } from "#/lib/name-availability";
import { getCurrency, isCurrencyCode } from "#/lib/utils";
import { BankAccountSelectField } from "#/modules/bank-accounts/components/bank-account-select-field";
import { bankAccountsQueryOption } from "#/modules/bank-accounts/query-options";
import { bucketsQueryOptions } from "#/modules/buckets/query-options";
import { debtsQueryOptions } from "#/modules/debts/query-options";
import { DistributionLinesField } from "#/modules/distributions/components/distribution-lines-field";
import { SplitSummary } from "#/modules/distributions/components/split-summary";
import {
  validateDistributionName,
  type SavedDistribution,
} from "#/modules/distributions/functions";
import {
  useCreateDistributionMutation,
  useEditDistributionMutation,
} from "#/modules/distributions/mutations";
import { createDistributionSchema } from "#/modules/distributions/schemas";
import {
  draftsToPlanLines,
  getLineTargetId,
  toCents,
  type DistributionLineDraft,
  type DistributionLineTarget,
} from "#/modules/distributions/utils";
import { confirm } from "#/stores/use-confirm";

const FALLBACK_CURRENCY = "PHP";

export type DistributionFormControls = {
  isDirty: () => boolean;
  /** The name of the Distribution being copied, when the form is a Duplicate. */
  duplicateOfName: string | undefined;
  reset: () => void;
  /** Adds a line for a Bucket the User just set up, keeping the lines already typed. */
  selectBucket: (bucketId: string) => void;
  /** Adds a line for a Debt the User just recorded, keeping the lines already typed. */
  selectDebt: (debt: Pick<Debt, "id" | "direction">) => void;
  /** Picks a Bank Account the User just registered. */
  selectBankAccount: (bankAccountId: string) => void;
};

/** Buckets first, then Debts, the order picking in the line editor keeps them in. */
function toLineDrafts(distribution: SavedDistribution): DistributionLineDraft[] {
  const drafts = distribution.lines.map((line): DistributionLineDraft => {
    const value = {
      mode: line.basisPoints === null ? ("fixed" as const) : ("percent" as const),
      value:
        line.basisPoints === null
          ? String(centsToAmountInput(line.amount ?? 0))
          : String(line.basisPoints / 100),
    };

    return line.kind === "bucket"
      ? { kind: "bucket", bucketId: line.targetId, ...value }
      : { kind: "debt", debtId: line.targetId, direction: line.kind, ...value };
  });

  return [
    ...drafts.filter((draft) => draft.kind === "bucket"),
    ...drafts.filter((draft) => draft.kind === "debt"),
  ];
}

/** Keeps the lines already typed for targets that stay picked, and starts new ones at 10%. */
function mergeSelectedTargets(
  current: DistributionLineDraft[],
  picked: DistributionLineTarget[],
): DistributionLineDraft[] {
  const pickedLines = picked.map(
    (target) =>
      current.find((line) => getLineTargetId(line) === getLineTargetId(target)) ?? {
        ...target,
        mode: "percent" as const,
        value: "10",
      },
  );

  // Buckets first, then Debts, whatever order they were picked in.
  return [
    ...pickedLines.filter((line) => line.kind === "bucket"),
    ...pickedLines.filter((line) => line.kind === "debt"),
  ];
}

type DistributionFormProps = {
  /** The saved Distribution to edit. Without it, the form creates one. */
  distribution?: SavedDistribution;
  /** A saved Distribution to prefill a new one from. Nothing is saved until the User presses Save. */
  duplicateOf?: SavedDistribution;
  onSaved: () => void;
  nestedDrawers: DistributionNestedDrawers;
  ref: Ref<DistributionFormControls>;
};

export function DistributionForm({
  distribution,
  duplicateOf,
  onSaved,
  nestedDrawers,
  ref,
}: DistributionFormProps) {
  const createMutation = useCreateDistributionMutation();
  const editMutation = useEditDistributionMutation();

  const bucketsQuery = useQuery(bucketsQueryOptions);
  const debtsQuery = useQuery(debtsQueryOptions);
  const bankAccountsQuery = useQuery(bankAccountsQueryOption());

  const source = distribution ?? duplicateOf;

  const defaultValues: z.input<typeof createDistributionSchema> = source
    ? {
        name: duplicateOf ? `${duplicateOf.name} copy` : source.name,
        bankAccountId: source.bankAccount.id,
        amount: centsToAmountInput(source.amount),
        lines: toLineDrafts(source),
      }
    : {
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
        if (distribution) {
          // The edit schema is strict and takes no account, because a saved account never changes.
          await editMutation.mutateAsync({
            data: {
              distributionId: distribution.id,
              name: data.name,
              amount: data.amount,
              lines: data.lines,
            },
          });
        } else {
          await createMutation.mutateAsync({ data });
        }
      } catch (error) {
        console.error(error);

        return;
      }

      form.reset();
      onSaved();
    },
  });

  // The account the lines were built for. It moves only when a switch is accepted, so a cancelled
  // switch can put the previous account back.
  const committedBankAccountIdRef = useRef(defaultValues.bankAccountId);

  useImperativeHandle(
    ref,
    () => ({
      isDirty: () => form.state.isDirty,
      duplicateOfName: duplicateOf?.name,
      reset: () => {
        form.reset();
        committedBankAccountIdRef.current = defaultValues.bankAccountId;
      },
      selectBucket: (bucketId) => {
        const currentLines = form.getFieldValue("lines") as DistributionLineDraft[];

        form.setFieldValue(
          "lines",
          mergeSelectedTargets(currentLines, [...currentLines, { kind: "bucket", bucketId }]),
        );
      },
      selectDebt: (debt) => {
        const currentLines = form.getFieldValue("lines") as DistributionLineDraft[];

        form.setFieldValue(
          "lines",
          mergeSelectedTargets(currentLines, [
            ...currentLines,
            { kind: "debt", debtId: debt.id, direction: debt.direction },
          ]),
        );
      },
      selectBankAccount: (bankAccountId) => form.setFieldValue("bankAccountId", bankAccountId),
    }),
    [form, defaultValues.bankAccountId, duplicateOf?.name],
  );

  const bankAccountId = useSelector(form.store, (state) => state.values.bankAccountId);
  const amount = useSelector(form.store, (state) => state.values.amount);
  const lines = useSelector(form.store, (state) => state.values.lines) as DistributionLineDraft[];

  const bankAccount = bankAccountsQuery.data?.find((account) => account.id === bankAccountId);
  const currency = bankAccount?.currency ?? FALLBACK_CURRENCY;
  // The picker only lists Debts the account can repay. Without an account there is no currency yet.
  const pickableDebts = bankAccount
    ? (debtsQuery.data ?? []).filter((debt) => debt.currency === bankAccount.currency)
    : [];
  const currencySymbol =
    (isCurrencyCode(currency) ? getCurrency(currency)?.symbol : undefined) ?? currency;

  const copy = distribution
    ? {
        title: "Edit Distribution",
        description: "Update the name, default amount or lines of this distribution.",
        submitLabel: "Edit Distribution",
      }
    : duplicateOf
      ? {
          title: "Duplicate Distribution",
          description: `Copy ${duplicateOf.name} into a new distribution. Nothing is saved until you confirm.`,
          submitLabel: "Duplicate Distribution",
        }
      : {
          title: "Create Distribution",
          description: "Save a routine you can trigger each payday.",
          submitLabel: "Create Distribution",
        };

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>{copy.title}</DrawerTitle>
        <DrawerDescription>{copy.description}</DrawerDescription>
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
                  refineNameAvailability((name) =>
                    validateDistributionName({ data: { name, excludeId: distribution?.id } }),
                  ),
                ),
              }}
            >
              {(field) => (
                <field.ValidatedInput label="Name" placeholder="Payday" maxLength={100} />
              )}
            </form.AppField>
            <form.AppField
              name="bankAccountId"
              listeners={{
                // Fixed amounts and Debt lines belong to the old currency, so a switch to another one
                // clears every line, once the User agrees.
                onChange: async ({ value }) => {
                  const previousBankAccountId = committedBankAccountIdRef.current;
                  const currentLines = form.getFieldValue("lines") as DistributionLineDraft[];

                  const currencyOf = (id: string) =>
                    bankAccountsQuery.data?.find((account) => account.id === id)?.currency;
                  const previousCurrency = currencyOf(previousBankAccountId);
                  const nextCurrency = currencyOf(value);

                  const resetsLines =
                    currentLines.length > 0 &&
                    previousCurrency !== undefined &&
                    nextCurrency !== undefined &&
                    previousCurrency !== nextCurrency;

                  if (!resetsLines) {
                    committedBankAccountIdRef.current = value;

                    return;
                  }

                  const confirmed = await confirm("Reset lines?", {
                    description: `This account is in ${nextCurrency}, but the lines were set up in ${previousCurrency}. Switching clears all of them. The default amount stays.`,
                    confirmLabel: "Reset Lines",
                    cancelLabel: "Cancel",
                  });

                  if (confirmed) {
                    committedBankAccountIdRef.current = value;
                    form.setFieldValue("lines", []);
                  } else {
                    form.setFieldValue("bankAccountId", previousBankAccountId);
                  }
                },
              }}
            >
              {() => (
                <BankAccountSelectField
                  label="Bank Account"
                  description="The account every record goes into. It can't be changed once saved."
                  disabled={distribution !== undefined}
                  placeholder="Select bank account"
                  currency={null}
                  bankAccountsQuery={bankAccountsQuery}
                  bankAccounts={bankAccountsQuery.data}
                  emptyContent={
                    <>
                      <FieldError>Register a bank account first.</FieldError>
                      <DrawerTrigger
                        ref={nestedDrawers.registerBankAccountButtonRef}
                        handle={nestedDrawers.registerBankAccountHandle}
                        payload={{ currency: FALLBACK_CURRENCY }}
                        render={<Button type="button" variant="outline" />}
                      >
                        Register an account
                      </DrawerTrigger>
                    </>
                  }
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
                  debts={pickableDebts}
                  setUpBucketHandle={nestedDrawers.setUpBucketHandle}
                  recordDebtHandle={nestedDrawers.recordDebtHandle}
                  createTargetButtonRef={nestedDrawers.createTargetButtonRef}
                  debtsUnavailableReason={
                    bankAccount ? null : "Select a bank account to pick Debts."
                  }
                  currency={currency}
                  amountCents={toCents(String(amount ?? ""))}
                  errors={
                    linesField.state.meta.isTouched
                      ? (linesField.state.meta.errors as { message?: string }[])
                      : []
                  }
                  onSelectTargets={(targets) =>
                    linesField.handleChange(
                      mergeSelectedTargets(
                        linesField.state.value as DistributionLineDraft[],
                        targets,
                      ),
                    )
                  }
                  onChangeMode={(index, mode) =>
                    linesField.replaceValue(index, {
                      ...(linesField.state.value[index] as DistributionLineDraft),
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
          <form.Button form={form.formId}>{copy.submitLabel}</form.Button>
        </form.AppForm>
        <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
      </DrawerFooter>
    </>
  );
}
