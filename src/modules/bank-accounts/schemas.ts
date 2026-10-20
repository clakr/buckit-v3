import { z } from "zod";

import { CURRENCIES_CODES } from "#/lib/constants";
import { nonNegativeAmountSchema } from "#/lib/money";

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
  startingBalance: nonNegativeAmountSchema("Starting balance cannot be negative.").default(0),
});

export const editBankAccountSchema = z.strictObject({
  ...verifyUserBankAccountMiddlewareSchema.shape,
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
});

export const validateBankAccountNameSchema = z.object({
  name: registerBankAccountSchema.shape.name,
  excludeId: z.string().optional(),
});

export const getBankAccountsSchema = z
  .object({ currency: z.enum(CURRENCIES_CODES).optional() })
  .optional();
