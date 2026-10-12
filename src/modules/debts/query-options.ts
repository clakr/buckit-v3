import { queryOptions } from "@tanstack/react-query";

import type { BankAccount, Debt } from "#/db/schema";

import { getBankAccountLinkedDebts, getDebt, getDebts } from "#/modules/debts/functions";

export const debtsQueryOptions = queryOptions({
  queryKey: ["debts"],
  queryFn: getDebts,
});

export function debtQueryOption(debtId: Debt["id"]) {
  return queryOptions({
    queryKey: ["debts", debtId],
    queryFn: () =>
      getDebt({
        data: {
          debtId,
        },
      }),
  });
}

export function bankAccountLinkedDebtsQueryOption(bankAccountId: BankAccount["id"]) {
  return queryOptions({
    queryKey: ["debts", "bank-account", bankAccountId],
    queryFn: () =>
      getBankAccountLinkedDebts({
        data: {
          bankAccountId,
        },
      }),
  });
}
