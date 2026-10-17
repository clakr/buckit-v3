import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";

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
import { useFieldContext } from "#/integrations/tanstack-form";
import { currencyCodec } from "#/lib/codecs";
import { formatCurrency } from "#/lib/utils";
import { BankAccountFigures } from "#/modules/bank-accounts/components/bank-account-figures";

type BankAccountWithFigures = Awaited<ReturnType<typeof getBankAccounts>>[number];

type Props = {
  label: string;
  /** `null` for none. */
  description: ReactNode;
  placeholder: string;
  /** The currency the list is limited to, for the load-failure copy; `null` when it isn't. */
  currency: string | null;
  bankAccountsQuery: Pick<UseQueryResult<BankAccountWithFigures[]>, "status" | "refetch">;
  /** The accounts that can be picked, already narrowed by the caller. */
  bankAccounts: BankAccountWithFigures[] | undefined;
  /** Shown in place of the select when nothing can be picked. */
  emptyContent: ReactNode;
};

// A form field holding a Bank Account id. Each option shows the account's figures, and so does the
// picked one underneath. Lives in a `form.AppField`, so it reads the field it's rendered in.
export function BankAccountSelectField({
  label,
  description,
  placeholder,
  currency,
  bankAccountsQuery,
  bankAccounts,
  emptyContent,
}: Props) {
  const field = useFieldContext<string | null | undefined>();

  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const id = field.name;
  const errorId = `${id}-error`;

  const { status, refetch } = bankAccountsQuery;
  const isEmpty = status === "success" && !bankAccounts?.length;

  const picked = bankAccounts?.find((account) => account.id === field.state.value);

  function formatFigure(value: number, accountCurrency: string) {
    return formatCurrency(currencyCodec.encode(value), { currency: accountCurrency });
  }

  return (
    <Field data-invalid={isInvalid || status === "error"}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}

      {status === "error" ? (
        <>
          <FieldError>Could not load your {currency ? `${currency} ` : ""}accounts.</FieldError>
          <Button type="button" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </>
      ) : isEmpty ? (
        emptyContent
      ) : (
        <Select
          items={bankAccounts?.map((account) => ({ value: account.id, label: account.name }))}
          value={field.state.value ?? ""}
          onValueChange={(value) => field.handleChange(value as string)}
          disabled={status !== "success"}
        >
          <SelectTrigger
            id={id}
            className="w-full"
            onBlur={field.handleBlur}
            aria-invalid={isInvalid ? true : undefined}
            aria-labelledby={isInvalid ? errorId : undefined}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger>
            <SelectGroup>
              {bankAccounts?.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  <span className="flex w-full min-w-0 flex-col items-start gap-0.5">
                    <span className="w-full truncate">{account.name}</span>
                    <BankAccountFigures
                      balance={account.balance}
                      unallocated={account.unallocated}
                      currency={account.currency}
                    />
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}

      {picked ? (
        <FieldDescription>
          Balance{" "}
          <span className="font-semibold">{formatFigure(picked.balance, picked.currency)}</span>
          {picked.balance === picked.unallocated ? null : (
            <>
              {" "}
              · Unallocated{" "}
              <span className="font-semibold">
                {formatFigure(picked.unallocated, picked.currency)}
              </span>
            </>
          )}
        </FieldDescription>
      ) : null}

      {isInvalid && <FieldError id={errorId} errors={field.state.meta.errors} />}
    </Field>
  );
}
