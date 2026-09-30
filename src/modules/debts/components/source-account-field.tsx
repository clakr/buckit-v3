import { useQuery } from "@tanstack/react-query";
import { useId } from "react";

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
import { Spinner } from "#/components/ui/spinner";
import { currencyCodec } from "#/lib/codecs";
import { formatCurrency } from "#/lib/utils";
import { useRegisterBankAccountDialogStore } from "#/modules/bank-accounts/components/register-bank-account-dialog";
import { bankAccountsQueryOption } from "#/modules/bank-accounts/query-options";
import { getBankAccountUnallocatedBalance } from "#/modules/bank-accounts/utils";

type SourceAccountFieldProps = {
  currency: string;
  isQueryEnabled: boolean;
  bankAccountId: string | undefined;
  onBankAccountIdChange: (bankAccountId: string | undefined) => void;
};

function openRegisterBankAccountDialog() {
  useRegisterBankAccountDialogStore.getState().openDialog();
}

export function SourceAccountField({
  currency,
  isQueryEnabled,
  bankAccountId,
  onBankAccountIdChange,
}: SourceAccountFieldProps) {
  // @todo: should distinguish if network error or data not found
  const { status, data: bankAccounts } = useQuery({
    ...bankAccountsQueryOption({ currency }),
    enabled: isQueryEnabled,
  });

  const eligibleAccounts = bankAccounts?.filter((account) => {
    const amount = getBankAccountUnallocatedBalance({
      startingBalance: account.startingBalance,
      transactions: account.transactions,
      allocations: account.allocations,
    }).unallocated;

    return amount > 0;
  });

  const noEligibleAccounts = status === "success" && (eligibleAccounts?.length ?? 0) === 0;
  const id = useId();

  return (
    <Field data-invalid={noEligibleAccounts}>
      <FieldLabel htmlFor={id}>Funding Source</FieldLabel>
      <FieldDescription>
        Optional — leave empty if this isn't coming out of a tracked account.
      </FieldDescription>

      {noEligibleAccounts ? (
        <>
          <FieldError>No {currency} accounts with available balance.</FieldError>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={openRegisterBankAccountDialog}
          >
            Register a {currency} account
          </Button>
        </>
      ) : (
        <Select
          items={eligibleAccounts?.map((a) => ({ value: a.id, label: a.name }))}
          value={bankAccountId ?? ""}
          onValueChange={(value) => onBankAccountIdChange(value || undefined)}
          disabled={status !== "success"}
        >
          <SelectTrigger
            id={id}
            className="w-full"
            icon={status === "pending" ? <Spinner /> : undefined}
          >
            <SelectValue placeholder="No source account" />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger>
            <SelectGroup>
              {eligibleAccounts?.map((account) => {
                const { unallocated } = getBankAccountUnallocatedBalance({
                  startingBalance: account.startingBalance,
                  transactions: account.transactions,
                  allocations: account.allocations,
                });

                const amount = formatCurrency(currencyCodec.encode(unallocated), {
                  currency: account.currency,
                });

                return (
                  <SelectItem key={account.id} value={account.id}>
                    <span className="flex w-full min-w-0 items-center justify-between gap-4">
                      <span className="truncate">{account.name}</span>
                      <span className="shrink-0 text-muted-foreground tabular-nums">{amount}</span>
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
