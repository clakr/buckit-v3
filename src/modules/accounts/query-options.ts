import { queryOptions } from "@tanstack/react-query";

import type { BankAccount } from "#/db/schema";

import { getBankAccount, getBankAccounts } from "#/modules/accounts/functions";

export const bankAccountsQueryOption = queryOptions({
  queryKey: ["bank-accounts"],
  queryFn: getBankAccounts,
});

export function bankAccountQueryOption(bankAccountId: BankAccount["id"]) {
  return queryOptions({
    queryKey: ["bank-accounts", bankAccountId],
    queryFn: () => getBankAccount({ data: bankAccountId }),
  });
}
