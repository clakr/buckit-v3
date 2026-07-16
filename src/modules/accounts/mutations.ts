import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { addBankAccount } from "./functions";

export function useAddAccountMutation() {
  return useMutation({
    mutationFn: addBankAccount,
    onSuccess: () => {
      toast.success("Nice!", {
        description: "Account created.",
      });
    },
    onError: () => {
      toast.error("Oops!", {
        description: "Failed to create account. Please try again.",
      });
    },
  });
}
