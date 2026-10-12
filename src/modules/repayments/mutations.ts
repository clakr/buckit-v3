import { useMutation } from "@tanstack/react-query";

import { editRepayment, logRepayment } from "./functions";

export function useLogRepaymentMutation() {
  return useMutation({
    mutationFn: logRepayment,
    meta: {
      success: {
        title: "Repayment Logged",
        description: "Your repayment has been recorded.",
      },
      error: {
        title: "Failed to Log Repayment",
        description: "Please try again.",
      },
    },
  });
}

export function useEditRepaymentMutation() {
  return useMutation({
    mutationFn: editRepayment,
    meta: {
      success: {
        title: "Repayment Updated",
        description: "Your changes have been saved.",
      },
      error: {
        title: "Failed to Update Repayment",
        description: "Please try again.",
      },
    },
  });
}
