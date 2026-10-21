import z from "zod";

import type { BankAccount, Bucket } from "#/db/schema";

const DECIMAL_PLACES_MESSAGE = "Use at most 2 decimal places.";

function hasAtMostTwoDecimals(amount: number) {
  return Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-6;
}

function toCents(amount: number) {
  return Math.round(amount * 100);
}

function inCents(min: number, minMessage: string) {
  return z.codec(
    z.coerce.number().min(min, minMessage).refine(hasAtMostTwoDecimals, DECIMAL_PLACES_MESSAGE),
    z.number().int(),
    { decode: toCents, encode: (cents) => cents / 100 },
  );
}

export const amountSchema = inCents(0.01, "Amount must be greater than 0.");

export function nonNegativeAmountSchema(message: string) {
  return inCents(0, message);
}

export function centsToAmountInput(cents: number) {
  return cents / 100;
}

export function formatMoney(cents: number, currency: string) {
  return Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function exceedsAvailable(amountInput: unknown, availableCents: number) {
  const result = amountSchema.safeParse(amountInput);

  return result.success && result.data > availableCents;
}

export function describeInsufficientUnallocated({
  bankAccount,
  availableCents,
  purpose,
}: {
  bankAccount: Pick<BankAccount, "name" | "currency">;
  availableCents: number;
  purpose?: "loan" | "repayment";
}) {
  const forPurpose = purpose ? ` for this ${purpose}` : "";

  return `Insufficient unallocated balance in ${bankAccount.name}${forPurpose}. Available: ${formatMoney(availableCents, bankAccount.currency)}`;
}

export function describeInsufficientHeld({
  bucket,
  bankAccount,
  availableCents,
}: {
  bucket: Pick<Bucket, "name">;
  bankAccount: Pick<BankAccount, "name" | "currency">;
  availableCents: number;
}) {
  return `${bucket.name} doesn't hold that much from ${bankAccount.name}. Available: ${formatMoney(availableCents, bankAccount.currency)}`;
}

export function describeAllocationAlreadyWithdrawn({
  bucket,
  bankAccount,
  withdrawnCents,
  change,
}: {
  bucket: Pick<Bucket, "name">;
  bankAccount: Pick<BankAccount, "name" | "currency">;
  withdrawnCents: number;
  change: "edit" | "delete";
}) {
  const withdrawn = formatMoney(withdrawnCents, bankAccount.currency);
  const consequence =
    change === "delete" ? "so it can't be deleted" : `so its amount can't go below ${withdrawn}`;

  return `${withdrawn} of this allocation has already been withdrawn from ${bucket.name} (${bankAccount.name}), ${consequence}.`;
}
