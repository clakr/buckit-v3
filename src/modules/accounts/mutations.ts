import { useMutation } from "@tanstack/react-query";

import { addBankAccount } from "#/modules/accounts/functions";

export function useAddAccountMutation() {
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
