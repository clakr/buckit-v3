import { queryOptions } from "@tanstack/react-query";

import type { Bucket } from "#/db/schema";

import { getWithdrawals, getWithdrawalSources } from "#/modules/withdrawals/functions";

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
