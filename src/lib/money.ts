import z from "zod";

import type { BankAccount, Bucket } from "#/db/schema";
import type { HistoryBreach } from "#/modules/bank-accounts/ledger";
import type { HeldBreach } from "#/modules/buckets/ledger";

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

const BREACH_DATE_FORMAT = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export function describeHistoryShortfall({
  bankAccount,
  historyBreach,
}: {
  bankAccount: Pick<BankAccount, "name">;
  historyBreach: HistoryBreach;
}) {
  const figure = historyBreach.figure === "balance" ? "balance" : "unallocated balance";

  return `This would leave ${bankAccount.name} with a negative ${figure} on ${BREACH_DATE_FORMAT.format(historyBreach.date)}. Adjust the date or amount, or log the income that covers it first.`;
}

export function describeInsufficientUnallocated({
  bankAccount,
  availableCents,
  purpose,
  historyBreach,
}: {
  bankAccount: Pick<BankAccount, "name" | "currency">;
  availableCents: number;
  purpose?: "loan" | "repayment";
  historyBreach?: HistoryBreach | null;
}) {
  if (historyBreach) return describeHistoryShortfall({ bankAccount, historyBreach });

  const forPurpose = purpose ? ` for this ${purpose}` : "";

  return `Insufficient unallocated balance in ${bankAccount.name}${forPurpose}. Available: ${formatMoney(availableCents, bankAccount.currency)}`;
}

export function describeHeldHistoryShortfall({
  bucket,
  bankAccount,
  historyBreach,
}: {
  bucket: Pick<Bucket, "name">;
  bankAccount: Pick<BankAccount, "name">;
  historyBreach: HeldBreach;
}) {
  return `This would leave ${bucket.name} holding a negative amount from ${bankAccount.name} on ${BREACH_DATE_FORMAT.format(historyBreach.date)}. Adjust the date or amount, or allocate the money first.`;
}

export function describeInsufficientHeld({
  bucket,
  bankAccount,
  availableCents,
  historyBreach,
}: {
  bucket: Pick<Bucket, "name">;
  bankAccount: Pick<BankAccount, "name" | "currency">;
  availableCents: number;
  historyBreach?: HeldBreach | null;
}) {
  if (historyBreach) return describeHeldHistoryShortfall({ bucket, bankAccount, historyBreach });

  return `${bucket.name} doesn't hold that much from ${bankAccount.name}. Available: ${formatMoney(availableCents, bankAccount.currency)}`;
}

export function describeAllocationAlreadyWithdrawn({
  bucket,
  bankAccount,
  withdrawnCents,
  change,
  historyBreach,
}: {
  bucket: Pick<Bucket, "name">;
  bankAccount: Pick<BankAccount, "name" | "currency">;
  withdrawnCents: number;
  change: "edit" | "delete";
  historyBreach?: HeldBreach | null;
}) {
  if (historyBreach) return describeHeldHistoryShortfall({ bucket, bankAccount, historyBreach });

  const withdrawn = formatMoney(withdrawnCents, bankAccount.currency);
  const consequence =
    change === "delete" ? "so it can't be deleted" : `so its amount can't go below ${withdrawn}`;

  return `${withdrawn} of this allocation has already been withdrawn from ${bucket.name} (${bankAccount.name}), ${consequence}.`;
}
