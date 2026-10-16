import type { BankAccount } from "#/db/schema";

import { currencyCodec } from "#/lib/codecs";
import { formatCurrency } from "#/lib/utils";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const REPAYMENT_BEFORE_DEBT_MESSAGE =
  "A repayment can't be dated before its debt was recorded.";

/**
 * Server-side backstop for "a repayment can't predate its Debt". The dialogs compare
 * calendar days in the user's timezone, which the server doesn't know. Whatever the
 * timezone, the start of the Debt's day is less than a day before its saved instant,
 * so this only rejects dates no dialog could have allowed.
 */
export function isRepaymentDateBeforeDebt(repaymentDate: Date, debtDate: Date) {
  return repaymentDate.getTime() < debtDate.getTime() - DAY_IN_MS;
}

/**
 * Why a repayment's amount is more than its account can pay out, as the Log dialog shows it
 * before submitting and the write rejects it. `available` is in database amounts.
 */
export function describeInsufficientRepaymentAccount({
  bankAccount,
  available,
}: {
  bankAccount: Pick<BankAccount, "name" | "currency">;
  available: number;
}) {
  return `Insufficient unallocated balance in ${bankAccount.name} for this repayment. Available: ${formatCurrency(
    currencyCodec.encode(available),
    { currency: bankAccount.currency },
  )}`;
}
