import { queryOptions } from "@tanstack/react-query";

import type { Bucket } from "#/db/schema";

import { getBucketGoal, getGoalCurrencies } from "#/modules/goals/functions";

export function bucketGoalQueryOption(bucketId: Bucket["id"]) {
  return queryOptions({
    queryKey: ["goals", { bucketId }],
    queryFn: () => getBucketGoal({ data: { bucketId } }),
  });
}

export const goalCurrenciesQueryOptions = queryOptions({
  queryKey: ["goals", "currencies"],
  queryFn: getGoalCurrencies,
});
