import { queryOptions } from "@tanstack/react-query";

import type { BankAccount } from "#/db/schema";

import {
  getBankAccount,
  getBankAccountDeletionImpact,
  getBankAccounts,
  getBankAccountsWithTrend,
} from "#/modules/bank-accounts/functions";

export function bankAccountsQueryOption(params?: { currency?: BankAccount["currency"] }) {
  return queryOptions({
    queryKey: ["bank-accounts", params],
    queryFn: () => getBankAccounts({ data: params }),
  });
}

export function bankAccountsWithTrendQueryOption() {
  return queryOptions({
    queryKey: ["bank-accounts", "with-trend"],
    queryFn: () => getBankAccountsWithTrend(),
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

export function bankAccountDeletionImpactQueryOption(bankAccountId: BankAccount["id"]) {
  return queryOptions({
    queryKey: ["bank-accounts", bankAccountId, "deletion-impact"],
    queryFn: () =>
      getBankAccountDeletionImpact({
        data: {
          bankAccountId,
        },
      }),
  });
}
