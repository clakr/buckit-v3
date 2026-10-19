import z from "zod";

import type { BankAccount } from "#/db/schema";

/*
 * Money: an amount is stored as an integer number of cents, always next to the currency it's in.
 * Forms and server functions take amounts through the schemas here, and screens show them through
 * `formatMoney`, so nothing else converts between cents and what the user types.
 *
 * Known limit: every currency is treated as having 2 decimal places. That's wrong for currencies
 * like JPY (0) or KWD (3), which the currency picker still offers.
 */

const DECIMAL_PLACES_MESSAGE = "Use at most 2 decimal places.";

// Floats can't represent most cents exactly (2100.01 * 100 = 210001.00000000003), so compare to
// the nearest cent within a tolerance instead of `Number.isInteger`.
function hasAtMostTwoDecimals(amount: number) {
  return Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-6;
}

function toCents(amount: number) {
  return Math.round(amount * 100);
}

function inCents(amount: z.ZodNumber) {
  return z.codec(amount.refine(hasAtMostTwoDecimals, DECIMAL_PLACES_MESSAGE), z.number().int(), {
    decode: toCents,
    encode: (cents) => cents / 100,
  });
}

/** An amount the user types: more than 0, at most 2 decimals. Parses to cents. */
export const amountSchema = inCents(z.coerce.number().min(0.01, "Amount must be greater than 0."));

/** Like `amountSchema`, but 0 is allowed (e.g. a starting balance). Parses to cents. */
export function nonNegativeAmountSchema(message: string) {
  return inCents(z.coerce.number().min(0, message));
}

/** Cents as an amount for a form field's starting value. */
export function centsToAmountInput(cents: number) {
  return cents / 100;
}

/** Cents shown in their currency, e.g. "₱1,234.50". */
export function formatMoney(cents: number, currency: string) {
  return Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Whether what the user typed is more than `availableCents`. Input that isn't a valid amount yet
 * is never "more": the amount schema reports that instead.
 */
export function exceedsAvailable(amountInput: unknown, availableCents: number) {
  const result = amountSchema.safeParse(amountInput);

  return result.success && result.data > availableCents;
}

/**
 * Why an amount is more than a Bank Account can take out of its Unallocated balance, as dialogs
 * show it before submitting and the writes reject it. `available` is in cents.
 */
export function describeInsufficientUnallocated({
  bankAccount,
  available,
  purpose,
}: {
  bankAccount: Pick<BankAccount, "name" | "currency">;
  available: number;
  purpose?: "loan" | "repayment";
}) {
  const forPurpose = purpose ? ` for this ${purpose}` : "";

  return `Insufficient unallocated balance in ${bankAccount.name}${forPurpose}. Available: ${formatMoney(available, bankAccount.currency)}`;
}
