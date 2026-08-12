import { useMutation } from "@tanstack/react-query";

import { editAllocation, logAllocation } from "#/modules/allocations/functions";

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

export function useEditAllocationMutation() {
  return useMutation({
    mutationFn: editAllocation,
    meta: {
      success: {
        title: "Allocation updated",
        description: "The allocation has been saved.",
      },
      error: {
        title: "Failed to update allocation",
        description: "Please try again.",
      },
    },
  });
}
