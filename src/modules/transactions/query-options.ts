import { queryOptions } from "@tanstack/react-query";

import type { Transaction } from "#/db/schema";

import {
  getTransaction,
  getTransactions,
} from "#/modules/transactions/functions";

export function transactionQueryOption(transactionId: Transaction["id"]) {
  return queryOptions({
    queryKey: ["transactions", transactionId],
    queryFn: () =>
      getTransaction({
        data: {
          transactionId,
        },
      }),
  });
}

export const transactionsQueryOptions = queryOptions({
  queryKey: ["transactions"],
  queryFn: getTransactions,
});
