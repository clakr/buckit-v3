import { useMutation } from "@tanstack/react-query";

import { logRepayment } from "./functions";

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
