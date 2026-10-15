import type { z } from "zod";

import { queryOptions } from "@tanstack/react-query";

import type { Allocation } from "#/db/schema";
import type { getAllocationsSchema } from "#/modules/allocations/schemas";

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

export function allocationsQueryOption(scope: z.input<typeof getAllocationsSchema>) {
  return queryOptions({
    queryKey: ["allocations", scope],
    queryFn: () => getAllocations({ data: scope }),
  });
}
