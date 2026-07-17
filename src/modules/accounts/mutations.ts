import { useMutation } from "@tanstack/react-query";

import { addBankAccount } from "./functions";

export function useAddAccountMutation() {
  return useMutation({
    mutationFn: addBankAccount,
    meta: {
      "success-message": "Account created.",
      "error-message": "Failed to create account. Please try again.",
    },
  });
}
