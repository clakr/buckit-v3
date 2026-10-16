const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Server-side backstop for "a repayment can't predate its Debt". The dialogs compare
 * calendar days in the user's timezone, which the server doesn't know. Whatever the
 * timezone, the start of the Debt's day is less than a day before its saved instant,
 * so this only rejects dates no dialog could have allowed.
 */
export function isRepaymentDateBeforeDebt(repaymentDate: Date, debtDate: Date) {
  return repaymentDate.getTime() < debtDate.getTime() - DAY_IN_MS;
}
