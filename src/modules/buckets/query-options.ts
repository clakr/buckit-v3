import { queryOptions } from "@tanstack/react-query";

import type { Bucket } from "#/db/schema";
import type { LedgerPageRequest } from "#/lib/ledger-page";

import {
  getBucket,
  getBucketDeletionImpact,
  getBucketLedger,
  getBuckets,
} from "#/modules/buckets/functions";

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

export function bucketDeletionImpactQueryOption(bucketId: Bucket["id"]) {
  return queryOptions({
    queryKey: ["buckets", bucketId, "deletion-impact"],
    queryFn: () =>
      getBucketDeletionImpact({
        data: {
          bucketId,
        },
      }),
  });
}

export function bucketLedgerQueryOption(bucketId: Bucket["id"], page: LedgerPageRequest) {
  return queryOptions({
    queryKey: ["buckets", bucketId, "ledger", page],
    queryFn: () =>
      getBucketLedger({
        data: {
          bucketId,
          ...page,
        },
      }),
  });
}
