import { queryOptions } from "@tanstack/react-query";

import type { Bucket, Withdrawal } from "#/db/schema";

import {
  getWithdrawal,
  getWithdrawals,
  getWithdrawalSources,
} from "#/modules/withdrawals/functions";

export function withdrawalQueryOption(withdrawalId: Withdrawal["id"]) {
  return queryOptions({
    queryKey: ["withdrawals", withdrawalId],
    queryFn: () => getWithdrawal({ data: { withdrawalId } }),
  });
}

export function withdrawalsQueryOption(bucketId: Bucket["id"]) {
  return queryOptions({
    queryKey: ["withdrawals", { bucketId }],
    queryFn: () => getWithdrawals({ data: { bucketId } }),
  });
}

export function withdrawalSourcesQueryOption(bucketId: Bucket["id"]) {
  return queryOptions({
    queryKey: ["withdrawals", { bucketId }, "sources"],
    queryFn: () => getWithdrawalSources({ data: { bucketId } }),
  });
}
