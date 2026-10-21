import { useMutation } from "@tanstack/react-query";

import { logWithdrawal } from "#/modules/withdrawals/functions";

export function useLogWithdrawalMutation() {
  return useMutation({
    mutationFn: logWithdrawal,
    meta: {
      success: {
        title: "Withdrawal Logged",
        description: "The money has left the bucket and its account.",
      },
      error: {
        title: "Failed to Log Withdrawal",
        description: "Please try again.",
      },
    },
  });
}
