import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import type { Distribution } from "#/db/schema";

import { getDistributions, previewDistribution } from "#/modules/distributions/functions";

export const distributionsQueryOptions = queryOptions({
  queryKey: ["distributions"],
  queryFn: getDistributions,
});

export function distributionPreviewQueryOptions(
  distributionId: Distribution["id"],
  amountCents: number,
) {
  return queryOptions({
    queryKey: ["distributions", distributionId, "preview", amountCents],
    queryFn: () => previewDistribution({ data: { distributionId, amount: amountCents / 100 } }),
    enabled: amountCents > 0,
    placeholderData: keepPreviousData,
  });
}
