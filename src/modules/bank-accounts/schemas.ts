import { z } from "zod";

import { CURRENCIES_CODES } from "#/lib/constants";

export const verifyUserBankAccountMiddlewareSchema = z.looseObject({
  bankAccountId: z.string().min(1, "No bank account ID provided"),
});

export const baseBankAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
});

export const registerBankAccountSchema = z.object({
  ...baseBankAccountSchema.shape,
  currency: z.enum(CURRENCIES_CODES),
  startingBalance: z.coerce.number().min(0, "Starting balance cannot be negative.").default(0),
});

export const editBankAccountSchema = z.strictObject({
  ...verifyUserBankAccountMiddlewareSchema.shape,
  ...baseBankAccountSchema.shape,
});

export const getBankAccountsSchema = z
  .object({ currency: z.enum(CURRENCIES_CODES).optional() })
  .optional();
