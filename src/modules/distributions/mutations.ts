import { useMutation } from "@tanstack/react-query";

import { createDistribution } from "#/modules/distributions/functions";

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
