import { format, isBefore, startOfDay } from "date-fns";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const REPAYMENT_BEFORE_DEBT_MESSAGE =
  "A repayment can't be dated before its debt was recorded.";

export function isRepaymentDateBeforeDebt(repaymentDate: Date, debtDate: Date) {
  return repaymentDate.getTime() < debtDate.getTime() - DAY_IN_MS;
}

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
