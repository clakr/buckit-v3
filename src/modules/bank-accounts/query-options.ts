import { queryOptions } from "@tanstack/react-query";

import type { BankAccount } from "#/db/schema";

import { getBankAccount, getBankAccounts } from "#/modules/bank-accounts/functions";

export function bankAccountsQueryOption(params?: { currency?: BankAccount["currency"] }) {
  return queryOptions({
    queryKey: ["bank-accounts", params],
    queryFn: () => getBankAccounts({ data: params }),
  });
}

export function bankAccountQueryOption(bankAccountId: BankAccount["id"]) {
  return queryOptions({
    queryKey: ["bank-accounts", bankAccountId],
    queryFn: () =>
      getBankAccount({
        data: {
          bankAccountId,
        },
      }),
  });
}
