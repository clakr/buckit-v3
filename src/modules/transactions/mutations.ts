import { useMutation } from "@tanstack/react-query";

import {
  logTransaction,
  editTransaction,
  deleteTransaction,
} from "#/modules/transactions/functions";

export function useLogTransactionMutation() {
  return useMutation({
    mutationFn: logTransaction,
    meta: {
      success: {
        title: "Transaction logged",
        description: "[type] of [amount] has been recorded.", // @todo: capitalize first letter
        toReplace: ["type", "amount"],
      },
      error: {
        title: "Failed to log transaction",
        description: "Please try again.",
      },
    },
  });
}

export function useEditTransactionMutation() {
  return useMutation({
    mutationFn: editTransaction,
    meta: {
      success: {
        title: "Transaction updated",
        description: "The [type] of [amount] has been updated.", // @todo: capitalize first letter
        toReplace: ["type", "amount"],
      },
      error: {
        title: "Failed to update transaction",
        description: "Please try again.",
      },
    },
  });
}

export function useDeleteTransactionMutation() {
  return useMutation({
    mutationFn: deleteTransaction,
    meta: {
      // @todo: have this returned to claude
      success: {
        title: "Transaction Deleted",
        description: "Transaction Deleted",
      },
      error: {
        title: "Failed to Delete Transaction",
        description: "Please try again.",
      },
    },
  });
}
