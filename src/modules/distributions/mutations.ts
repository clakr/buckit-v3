import { useMutation } from "@tanstack/react-query";

import { createDistribution, triggerDistribution } from "#/modules/distributions/functions";

export function useCreateDistributionMutation() {
  return useMutation({
    mutationFn: createDistribution,
    meta: {
      success: {
        title: "Distribution Created",
        description: "Your distribution has been saved.",
      },
      error: {
        title: "Failed to Create Distribution",
        description: "Please try again.",
      },
    },
  });
}

export function useTriggerDistributionMutation() {
  return useMutation({
    mutationFn: triggerDistribution,
    meta: {
      success: {
        title: "Distribution Triggered",
        description: "Your income, allocations and repayments have been recorded.",
      },
      error: {
        title: "Failed to Trigger Distribution",
        description: "Please try again.",
      },
    },
  });
}
