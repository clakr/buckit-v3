import { useSelector } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useImperativeHandle, useRef, type Ref } from "react";
import z from "zod";

import { Button } from "#/components/ui/button";
import {
  DrawerClose,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
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
  reset: () => void;
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
  kind: DistributionLineTarget["kind"],
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

  const otherLines = current.filter((line) => line.kind !== kind);

  // Buckets first, then Debts, so picking in either box never reorders the other's lines.
  return kind === "bucket" ? [...pickedLines, ...otherLines] : [...otherLines, ...pickedLines];
}

type DistributionFormProps = {
  /** The saved Distribution to edit. Without it, the form creates one. */
  distribution?: SavedDistribution;
  /** A saved Distribution to prefill a new one from. Nothing is saved until the User presses Save. */
  duplicateOf?: SavedDistribution;
  onSaved: () => void;
  ref: Ref<DistributionFormControls>;
};

export function DistributionForm({
  distribution,
  duplicateOf,
  onSaved,
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
      reset: () => {
        form.reset();
        committedBankAccountIdRef.current = defaultValues.bankAccountId;
      },
    }),
    [form, defaultValues.bankAccountId],
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

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>{distribution ? "Edit Distribution" : "Create Distribution"}</DrawerTitle>
        <DrawerDescription>
          {distribution
            ? "Update the name, default amount or lines of this distribution."
            : "Save a routine you can trigger each payday."}
        </DrawerDescription>
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
                  debts={pickableDebts}
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
                  onSelectBuckets={(bucketIds) =>
                    linesField.handleChange(
                      mergeSelectedTargets(
                        linesField.state.value as DistributionLineDraft[],
                        "bucket",
                        bucketIds.map((bucketId) => ({ kind: "bucket" as const, bucketId })),
                      ),
                    )
                  }
                  onSelectDebts={(debtIds) =>
                    linesField.handleChange(
                      mergeSelectedTargets(
                        linesField.state.value as DistributionLineDraft[],
                        "debt",
                        debtIds.flatMap((debtId) => {
                          const debt = pickableDebts.find((candidate) => candidate.id === debtId);

                          return debt
                            ? [{ kind: "debt" as const, debtId, direction: debt.direction }]
                            : [];
                        }),
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
          <form.Button form={form.formId}>
            {distribution ? "Edit Distribution" : "Create Distribution"}
          </form.Button>
        </form.AppForm>
        <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
      </DrawerFooter>
    </>
  );
}
