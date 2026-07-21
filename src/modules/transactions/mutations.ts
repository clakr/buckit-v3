import { useMutation } from "@tanstack/react-query";

import { logTransaction } from "#/modules/transactions/functions";

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
