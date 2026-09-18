import { queryOptions } from "@tanstack/react-query";

import type { Allocation } from "#/db/schema";

import { getAllocation, getAllocations } from "#/modules/allocations/functions";

export function allocationQueryOption(allocationId: Allocation["id"]) {
  return queryOptions({
    queryKey: ["allocations", allocationId],
    queryFn: () =>
      getAllocation({
        data: {
          allocationId,
        },
      }),
  });
}

export const allocationsQueryOptions = queryOptions({
  queryKey: ["allocations"],
  queryFn: getAllocations,
});
