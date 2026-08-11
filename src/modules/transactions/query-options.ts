import { queryOptions } from "@tanstack/react-query";

import type { Transaction } from "#/db/schema";

import { getTransaction } from "./functions";

export function transactionQueryOption(transactionId: Transaction["id"]) {
  return queryOptions({
    queryKey: ["transaction", transactionId],
    queryFn: () => getTransaction({ data: transactionId }),
  });
}
