import { queryOptions } from "@tanstack/react-query";

import type { Debt } from "#/db/schema";

import { getDebt, getDebts } from "#/modules/debts/functions";

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
