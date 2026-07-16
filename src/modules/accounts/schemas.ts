import { z } from "zod";

import { currenciesCodes } from "#/lib/constants";

import { validateBankAccountName } from "./functions";

export const addAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer")
    .superRefine(async (data, context) => {
      try {
        const hasNoExistingBankAccounts = await validateBankAccountName({
          data,
        });

        if (!hasNoExistingBankAccounts) {
          context.addIssue({
            code: "custom",
            message: "An account with this name already exists",
          });
        }
      } catch (error) {
        context.addIssue({
          code: "custom",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }),
  currency: z.enum(currenciesCodes),
  startingBalance: z.coerce
    .number()
    .min(0, "Starting balance cannot be negative.")
    .default(0),
});
