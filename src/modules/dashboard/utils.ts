import type { getBankAccounts } from "#/modules/bank-accounts/functions";

export type DashboardBankAccount = Awaited<ReturnType<typeof getBankAccounts>>[number];

export type CurrencyTotals = {
  currency: DashboardBankAccount["currency"];
  balance: number;
  unallocated: number;
  totalEarmarked: number;
  accountCount: number;
};

export function getCurrencyTotals(bankAccounts: DashboardBankAccount[]) {
  const totalsByCurrency = new Map<CurrencyTotals["currency"], CurrencyTotals>();

  for (const bankAccount of bankAccounts) {
    const totals = totalsByCurrency.get(bankAccount.currency) ?? {
      currency: bankAccount.currency,
      balance: 0,
      unallocated: 0,
      totalEarmarked: 0,
      accountCount: 0,
    };

    totals.balance += bankAccount.balance;
    totals.unallocated += bankAccount.unallocated;
    totals.totalEarmarked += bankAccount.totalEarmarked;
    totals.accountCount += 1;

    totalsByCurrency.set(bankAccount.currency, totals);
  }

  return [...totalsByCurrency.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}
