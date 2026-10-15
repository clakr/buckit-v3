import type { UseQueryResult } from "@tanstack/react-query";

import { useId } from "react";

import type { getBankAccounts } from "#/modules/bank-accounts/functions";

import { Button } from "#/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "#/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { BankAccountFigures } from "#/modules/bank-accounts/components/bank-account-figures";
import { useRegisterBankAccountDialogStore } from "#/modules/bank-accounts/components/register-bank-account-dialog";

type SourceAccountFieldProps = {
  currency: string;
  /** The user's accounts in `currency`, with figures; the dialog checks the amount against them. */
  bankAccountsQuery: Pick<
    UseQueryResult<Awaited<ReturnType<typeof getBankAccounts>>>,
    "status" | "data" | "refetch"
  >;
  bankAccountId: string | undefined;
  onBankAccountIdChange: (bankAccountId: string | undefined) => void;
};

export function SourceAccountField({
  currency,
  bankAccountsQuery,
  bankAccountId,
  onBankAccountIdChange,
}: SourceAccountFieldProps) {
  const { status, data: bankAccounts, refetch } = bankAccountsQuery;

  const eligibleAccounts = bankAccounts?.filter((account) => account.unallocated > 0);

  const noEligibleAccounts = status === "success" && (eligibleAccounts?.length ?? 0) === 0;
  const id = useId();

  function openRegisterBankAccountDialog() {
    const state = useRegisterBankAccountDialogStore.getState();

    state.openDialog();
    state.setCurrency(currency);
  }

  return (
    <Field data-invalid={noEligibleAccounts || status === "error"}>
      <FieldLabel htmlFor={id}>Funding Source</FieldLabel>
      <FieldDescription>
        Optional — leave empty if this isn't coming out of a tracked account.
      </FieldDescription>

      {status === "error" ? (
        <>
          <FieldError>Could not load your {currency} accounts.</FieldError>
          <Button type="button" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </>
      ) : noEligibleAccounts ? (
        <>
          <FieldError>No {currency} accounts with available balance.</FieldError>
          <Button type="button" variant="outline" onClick={openRegisterBankAccountDialog}>
            Register a/an {currency} account
          </Button>
        </>
      ) : (
        <Select
          items={eligibleAccounts?.map((a) => ({ value: a.id, label: a.name }))}
          value={bankAccountId ?? ""}
          onValueChange={(value) => onBankAccountIdChange(value || undefined)}
          disabled={status !== "success"}
        >
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder="No source account" />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger>
            <SelectGroup>
              {eligibleAccounts?.map((account) => {
                const { balance, unallocated } = account;

                return (
                  <SelectItem key={account.id} value={account.id}>
                    <span className="flex w-full min-w-0 flex-col items-start gap-0.5">
                      <span className="w-full truncate">{account.name}</span>
                      <BankAccountFigures
                        balance={balance}
                        unallocated={unallocated}
                        currency={account.currency}
                      />
                    </span>
                  </SelectItem>
                );
              })}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}
    </Field>
  );
}
