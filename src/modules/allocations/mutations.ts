import { useMutation } from "@tanstack/react-query";

import {
  deleteAllocation,
  editAllocation,
  logAllocation,
} from "#/modules/allocations/functions";

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

export function useDeleteAllocationMutation() {
  return useMutation({
    mutationFn: deleteAllocation,
    meta: {
      success: {
        title: "Allocation Deleted",
        description: "The allocation has been removed.",
      },
      error: {
        title: "Failed to Delete Allocation",
        description: "Please try again.",
      },
    },
  });
}
