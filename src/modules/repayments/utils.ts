import { format, isBefore, startOfDay } from "date-fns";

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
 * "A repayment can't predate its Debt" as a dialog applies it: earlier days greyed out in the
 * picker, and a field validator for a date that starts out too early (a Debt dated in the future,
 * with the date defaulting to today). By calendar day, so a repayment on the day the Debt was
 * recorded is fine whatever time of day either was saved with.
 */
export function getRepaymentDateRule(debtDate: Date) {
  return {
    disabledDays: { before: debtDate },
    validate(date: Date) {
      return isBefore(date, startOfDay(debtDate))
        ? { message: `Can't be before the debt was recorded (${format(debtDate, "PPP")}).` }
        : undefined;
    },
  };
}
