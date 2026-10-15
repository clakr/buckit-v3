import { z } from "zod";

import { CURRENCIES_CODES } from "#/lib/constants";

export const verifyUserBankAccountMiddlewareSchema = z.looseObject({
  bankAccountId: z.string().min(1, "No bank account ID provided"),
});

export const registerBankAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
  currency: z.enum(CURRENCIES_CODES),
  startingBalance: z.coerce.number().min(0, "Starting balance cannot be negative.").default(0),
});

export const editBankAccountSchema = z.strictObject({
  ...verifyUserBankAccountMiddlewareSchema.shape,
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
});

// `bankAccountId` is the account being renamed, left out of the comparison with its own name.
export const validateBankAccountNameSchema = z.object({
  name: registerBankAccountSchema.shape.name,
  bankAccountId: z.string().optional(),
});

export const getBankAccountsSchema = z
  .object({ currency: z.enum(CURRENCIES_CODES).optional() })
  .optional();
