import { queryOptions } from "@tanstack/react-query";

import type { Bucket } from "#/db/schema";

import { getBucket, getBuckets } from "#/modules/buckets/functions";

export const bucketsQueryOptions = queryOptions({
  queryKey: ["buckets"],
  queryFn: getBuckets,
});

export function bucketQueryOption(bucketId: Bucket["id"]) {
  return queryOptions({
    queryKey: ["buckets", bucketId],
    queryFn: () =>
      getBucket({
        data: {
          bucketId,
        },
      }),
  });
}
