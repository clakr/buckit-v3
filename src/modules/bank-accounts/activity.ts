import type { BankAccountFigures } from "#/modules/bank-accounts/utils";

import { replayLedger, type LedgerMovement } from "#/modules/bank-accounts/ledger";
import {
  BALANCE_TREND_DAYS,
  DAY_MS,
  getBalanceTrendWindowStart,
} from "#/modules/bank-accounts/utils";

export type AccountActivityDay = {
  date: number;
  income: number;
  expense: number;
  withdrawal: number;
  closingBalance: number;
};

export type AccountActivity = {
  windowStart: number;
  opening: BankAccountFigures;
  days: AccountActivityDay[];
};

export function getAccountActivity({
  startingBalance,
  movements,
  now,
}: {
  startingBalance: number;
  movements: LedgerMovement[];
  now: Date;
}): AccountActivity {
  const windowStart = getBalanceTrendWindowStart(now).getTime();
  const steps = replayLedger(startingBalance, movements).map((step) => ({
    ...step,
    day: Math.min(Math.floor((step.date.getTime() - windowStart) / DAY_MS), BALANCE_TREND_DAYS - 1),
  }));

  const firstStepInWindow = steps.findIndex(({ day }) => day >= 0);
  let stepIndex = firstStepInWindow === -1 ? steps.length : firstStepInWindow;
  const opening = steps[stepIndex - 1] ?? {
    balance: startingBalance,
    unallocated: startingBalance,
  };

  let runningBalance = opening.balance;

  const days = Array.from({ length: BALANCE_TREND_DAYS }, (_, day): AccountActivityDay => {
    const activityDay = {
      date: windowStart + day * DAY_MS,
      income: 0,
      expense: 0,
      withdrawal: 0,
    };

    for (; stepIndex < steps.length && steps[stepIndex].day === day; stepIndex++) {
      const step = steps[stepIndex];
      if (step.kind !== "allocation") activityDay[step.kind] += step.amount;
      runningBalance = step.balance;
    }

    return { ...activityDay, closingBalance: runningBalance };
  });

  return {
    windowStart,
    opening: {
      balance: opening.balance,
      unallocated: opening.unallocated,
      totalEarmarked: opening.balance - opening.unallocated,
    },
    days,
  };
}
