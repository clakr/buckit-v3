import { z } from "zod";

import { currenciesCodes } from "#/lib/constants";

import { validateBankAccountName } from "./functions";

export const addAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer")
    .refine(
      (data) => validateBankAccountName({ data }),
      "An account with this name already exists.",
    ),
  currency: z.enum(currenciesCodes),
  startingBalance: z.coerce.number().min(0, "Starting balance cannot be negative.").default(0),
});
