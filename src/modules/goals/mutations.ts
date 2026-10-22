import { useMutation } from "@tanstack/react-query";

import { addGoal, editGoal, removeGoal } from "#/modules/goals/functions";

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

export function useEditGoalMutation() {
  return useMutation({
    mutationFn: editGoal,
    meta: {
      success: {
        title: "Goal Updated",
        description: "Your goal's target has been saved.",
      },
      error: {
        title: "Failed to Update Goal",
        description: "Please try again.",
      },
    },
  });
}

export function useRemoveGoalMutation() {
  return useMutation({
    mutationFn: removeGoal,
    meta: {
      success: {
        title: "Goal Removed",
        description: "The bucket and its money are untouched.",
      },
      error: {
        title: "Failed to Remove Goal",
        description: "Please try again.",
      },
    },
  });
}
