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
        title: "Transaction Logged",
        description: "Your transaction has been recorded.",
      },
      error: {
        title: "Failed to Log Transaction",
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
        title: "Transaction Updated",
        description: "Your changes have been saved.",
      },
      error: {
        title: "Failed to Update Transaction",
        description: "Please try again.",
      },
    },
  });
}

export function useDeleteTransactionMutation() {
  return useMutation({
    mutationFn: deleteTransaction,
    meta: {
      success: {
        title: "Transaction Deleted",
        description: "The transaction has been removed.",
      },
      error: {
        title: "Failed to Delete Transaction",
        description: "Please try again.",
      },
    },
  });
}
