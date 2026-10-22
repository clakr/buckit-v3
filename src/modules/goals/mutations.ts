import { useMutation } from "@tanstack/react-query";

import { addGoal } from "#/modules/goals/functions";

export function useAddGoalMutation() {
  return useMutation({
    mutationFn: addGoal,
    meta: {
      success: {
        title: "Goal Added",
        description: "Your bucket now tracks progress toward this goal.",
      },
      error: {
        title: "Failed to Add Goal",
        description: "Please try again.",
      },
    },
  });
}
