import { useMutation } from "@tanstack/react-query";

import { recordDebt } from "#/modules/debts/functions";

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
