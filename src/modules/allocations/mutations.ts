import { useMutation } from "@tanstack/react-query";

import { logAllocation } from "#/modules/allocations/functions";

export function useLogAllocationMutation() {
  return useMutation({
    mutationFn: logAllocation,
    meta: {
      success: {
        title: "Allocation logged",
        description: "[amount] allocated to [bucket.name].",
        toReplace: ["amount", "bucket.name"],
      },
      error: {
        title: "Failed to log allocation",
        description: "Please try again.",
      },
    },
  });
}
