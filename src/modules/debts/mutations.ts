import { useMutation } from "@tanstack/react-query";

import { editDebt, recordDebt } from "#/modules/debts/functions";

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
