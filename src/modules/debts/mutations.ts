import { useMutation } from "@tanstack/react-query";

import {
  deleteDebt,
  editDebt,
  forgiveDebt,
  recordDebt,
  unforgiveDebt,
} from "#/modules/debts/functions";

export function useRecordDebtMutation() {
  return useMutation({
    mutationFn: recordDebt,
    meta: {
      success: {
        title: "Debt Recorded",
        description: "Your debt has been recorded.",
      },
      error: {
        title: "Failed to Record Debt",
        description: "Please try again.",
      },
    },
  });
}

export function useEditDebtMutation() {
  return useMutation({
    mutationFn: editDebt,
    meta: {
      success: {
        title: "Debt Updated",
        description: "Your changes have been saved.",
      },
      error: {
        title: "Failed to Update Debt",
        description: "Please try again.",
      },
    },
  });
}

export function useDeleteDebtMutation() {
  return useMutation({
    mutationFn: deleteDebt,
    meta: {
      success: {
        title: "Debt Deleted",
        description: "The debt and its repayments have been removed.",
      },
      error: {
        title: "Failed to Delete Debt",
        description: "Please try again.",
      },
    },
  });
}

export function useForgiveDebtMutation() {
  return useMutation({
    mutationFn: forgiveDebt,
    meta: {
      success: {
        title: "Debt Forgiven",
        description: "The outstanding balance has been written off.",
      },
      error: {
        title: "Failed to Forgive Debt",
        description: "Please try again.",
      },
    },
  });
}

export function useUnforgiveDebtMutation() {
  return useMutation({
    mutationFn: unforgiveDebt,
    meta: {
      success: {
        title: "Debt Reopened",
        description: "The debt is no longer forgiven.",
      },
      error: {
        title: "Failed to Reopen Debt",
        description: "Please try again.",
      },
    },
  });
}
