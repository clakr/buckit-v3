import { useMutation } from "@tanstack/react-query";

import { deleteWithdrawal, editWithdrawal, logWithdrawal } from "#/modules/withdrawals/functions";

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

export function useEditWithdrawalMutation() {
  return useMutation({
    mutationFn: editWithdrawal,
    meta: {
      success: {
        title: "Withdrawal Updated",
        description: "The withdrawal and its expense have been saved.",
      },
      error: {
        title: "Failed to Update Withdrawal",
        description: "Please try again.",
      },
    },
  });
}

export function useDeleteWithdrawalMutation() {
  return useMutation({
    mutationFn: deleteWithdrawal,
    meta: {
      success: {
        title: "Withdrawal Deleted",
        description: "The money is back in the bucket.",
      },
      error: {
        title: "Failed to Delete Withdrawal",
        description: "Please try again.",
      },
    },
  });
}
