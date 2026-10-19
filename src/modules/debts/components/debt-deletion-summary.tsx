import { IconBuildingBank } from "@tabler/icons-react";

import type { DebtDeletionImpact } from "#/modules/debts/deletion.server";

import { formatMoney } from "#/lib/money";

type Props = {
  impact: DebtDeletionImpact;
  deleteTransactions: boolean;
};

/** The accounts the linked Transactions moved money through, quoted for the dialog's copy. */
export function getLinkedBankAccountsLabel(impact: DebtDeletionImpact) {
  return impact.bankAccounts.map((account) => `"${account.name}"`).join(", ");
}

// The dialog's description: what goes with the Debt (and, if ticked, its linked
// Transactions), so the summary below only has to cover what survives but changes.
export function getDebtDeletionDescription({ impact, deleteTransactions }: Props) {
  const { repaymentCount } = impact;
  const transactionCount = impact.linkedTransactionIds.length;

  const deletedRecords = [
    repaymentCount
      ? `${repaymentCount} ${repaymentCount === 1 ? "repayment" : "repayments"}`
      : null,
    deleteTransactions && transactionCount
      ? `${transactionCount} linked ${transactionCount === 1 ? "transaction" : "transactions"}`
      : null,
  ].filter((part) => part !== null);

  return `Permanently delete the debt with "${impact.debt.name}"${deletedRecords.length ? ` with its ${deletedRecords.join(" and ")}` : ""}. This cannot be undone.`;
}

function formatBankAccountAmount(value: number, currency: string) {
  return formatMoney(value, currency);
}

// Same shape as `BankAccountDeletionSummary`: what survives but changes. Here that's each
// linked account's balance, and only when the linked Transactions are deleted too —
// keeping them changes nothing outside the Debt.
export function DebtDeletionSummary({ impact, deleteTransactions }: Props) {
  const transactionCount = impact.linkedTransactionIds.length;
  const bankAccountsLabel = getLinkedBankAccountsLabel(impact);

  return (
    <div className="flex flex-col gap-y-3">
      {!transactionCount ? (
        <p className="text-muted-foreground">Nothing outside this debt is affected.</p>
      ) : deleteTransactions ? (
        <table className="w-full tabular-nums">
          <thead className="text-[0.65rem] tracking-wide text-muted-foreground uppercase">
            <tr className="border-b">
              <th className="py-1 text-start font-medium">Balance in</th>
              <th className="py-1 text-end font-medium">Before</th>
              <th className="py-1 text-end font-medium">After</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {impact.bankAccounts.map((account) => (
              <tr key={account.id}>
                <td className="py-1.5">
                  <span className="flex items-center gap-x-1.5">
                    <IconBuildingBank className="size-4 text-muted-foreground" />
                    {account.name}
                  </span>
                </td>
                <td className="py-1.5 text-end text-muted-foreground">
                  {formatBankAccountAmount(account.balanceBefore, account.currency)}
                </td>
                <td className="py-1.5 text-end font-semibold">
                  {formatBankAccountAmount(account.balanceAfter, account.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-muted-foreground">
          {transactionCount} linked{" "}
          {transactionCount === 1 ? "transaction stays" : "transactions stay"} in{" "}
          {bankAccountsLabel} — no balance changes.
        </p>
      )}
    </div>
  );
}
