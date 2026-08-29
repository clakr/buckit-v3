import { useMutation } from "@tanstack/react-query";

import { addBankAccount } from "#/modules/bank-accounts/functions";

export function useAddBankAccountMutation() {
  return useMutation({
    mutationFn: addBankAccount,
    meta: {
      success: {
        title: "Account Created",
        description: "Your account has been added.",
      },
      error: {
        title: "Failed to Create Account",
        description: "Please try again.",
      },
    },
  });
}
