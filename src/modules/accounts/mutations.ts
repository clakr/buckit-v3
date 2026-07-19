import { useMutation } from "@tanstack/react-query";

import { addBankAccount } from "#/modules/accounts/functions";

export function useAddAccountMutation() {
  return useMutation({
    mutationFn: addBankAccount,
    meta: {
      success: {
        title: "Account created",
        description: "[name] has been added.",
        toReplace: ["name"],
      },
      error: {
        title: "Failed to create account",
        description: "Please try again.",
      },
    },
  });
}
