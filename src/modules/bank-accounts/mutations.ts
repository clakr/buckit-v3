import { useMutation } from "@tanstack/react-query";

import { addBankAccount, editBankAccount } from "#/modules/bank-accounts/functions";

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

export function useEditBankAccountMutation() {
  return useMutation({
    mutationFn: editBankAccount,
    meta: {
      success: {
        title: "Account Updated",
        description: "Your changes have been saved.",
      },
      error: {
        title: "Failed to Update Account",
        description: "Please try again.",
      },
    },
  });
}
