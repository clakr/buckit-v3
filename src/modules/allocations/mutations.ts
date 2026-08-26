import { useMutation } from "@tanstack/react-query";

import { editAllocation, logAllocation } from "#/modules/allocations/functions";

export function useLogAllocationMutation() {
  return useMutation({
    mutationFn: logAllocation,
    meta: {
      success: {
        title: "Allocation Logged",
        description: "Your allocation has been recorded.",
      },
      error: {
        title: "Failed to Log Allocation",
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
        title: "Allocation Updated",
        description: "The allocation has been saved.",
      },
      error: {
        title: "Failed to Update Allocation",
        description: "Please try again.",
      },
    },
  });
}
