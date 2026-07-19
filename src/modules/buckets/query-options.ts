import { queryOptions } from "@tanstack/react-query";

import { getBuckets } from "#/modules/buckets/functions";

export const bucketsQueryOptions = queryOptions({
  queryKey: ["buckets"],
  queryFn: getBuckets,
});
