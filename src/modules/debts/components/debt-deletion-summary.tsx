import { IconBuildingBank } from "@tabler/icons-react";

import type { getBankAccounts } from "#/modules/bank-accounts/functions";
import type { getDebt } from "#/modules/debts/functions";

import { currencyCodec } from "#/lib/codecs";
import { formatCurrency } from "#/lib/utils";
import { getDebtLinkedTransactionIds } from "#/modules/debts/utils";

type Props = {
  debt: NonNullable<Awaited<ReturnType<typeof getDebt>>>;
  bankAccounts: Awaited<ReturnType<typeof getBankAccounts>>;
  deleteTransactions: boolean;
};

// The dialog's description: what goes with the Debt (and, if ticked, its linked
// Transactions), so the summary below only has to cover what survives but changes.
export function getDebtDeletionDescription({
  debt,
  deleteTransactions,
}: Pick<Props, "debt" | "deleteTransactions">) {
  const repaymentCount = debt.repayments.length;
  const transactionCount = getDebtLinkedTransactionIds(debt).length;

  const deletedRecords = [
    repaymentCount
      ? `${repaymentCount} ${repaymentCount === 1 ? "repayment" : "repayments"}`
      : null,
    deleteTransactions && transactionCount
      ? `${transactionCount} linked ${transactionCount === 1 ? "transaction" : "transactions"}`
      : null,
  ].filter((part) => part !== null);

  return `Permanently delete the debt with "${debt.name}"${deletedRecords.length ? ` with its ${deletedRecords.join(" and ")}` : ""}. This cannot be undone.`;
}

// Same shape as `BankAccountDeletionSummary`: what survives but changes. Here that's each
// linked account's balance, and only when the linked Transactions are deleted too —
// keeping them changes nothing outside the Debt.
export function DebtDeletionSummary({ debt, bankAccounts, deleteTransactions }: Props) {
  function formatDebtAmount(value: number) {
    return formatCurrency(currencyCodec.encode(value), { currency: debt.currency });
  }

  // The linked Transactions' types follow the fixed direction → cash-flow mapping: a
  // receivable's origination is an `expense` and its repayments are `income`; a payable's
  // repayments are `expense`. Deleting income lowers a balance; deleting an expense raises it.
  const repaymentBalanceSign = debt.direction === "receivable" ? -1 : 1;
  const linkedTransactions = [
    ...(debt.originatingTransaction?.bankAccount
      ? [{ bankAccount: debt.originatingTransaction.bankAccount, balanceChange: debt.amount }]
      : []),
    ...debt.repayments.flatMap((repayment) =>
      repayment.transaction?.bankAccount
        ? [
            {
              bankAccount: repayment.transaction.bankAccount,
              balanceChange: repaymentBalanceSign * repayment.transaction.amount,
            },
          ]
        : [],
    ),
  ];

  const balanceChangeByBankAccountId = new Map<string, number>();
  for (const transaction of linkedTransactions) {
    balanceChangeByBankAccountId.set(
      transaction.bankAccount.id,
      (balanceChangeByBankAccountId.get(transaction.bankAccount.id) ?? 0) +
        transaction.balanceChange,
    );
  }

  const affectedBankAccounts = bankAccounts
    .filter((account) => balanceChangeByBankAccountId.has(account.id))
    .map((account) => {
      const { balance } = account;

      return {
        id: account.id,
        name: account.name,
        balanceBefore: balance,
        balanceAfter: balance + (balanceChangeByBankAccountId.get(account.id) ?? 0),
      };
    });

  const transactionCount = linkedTransactions.length;

  const bankAccountsLabel = [...new Set(linkedTransactions.map((t) => t.bankAccount.name))]
    .map((name) => `"${name}"`)
    .join(", ");

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
            {affectedBankAccounts.map((account) => (
              <tr key={account.id}>
                <td className="py-1.5">
                  <span className="flex items-center gap-x-1.5">
                    <IconBuildingBank className="size-4 text-muted-foreground" />
                    {account.name}
                  </span>
                </td>
                <td className="py-1.5 text-end text-muted-foreground">
                  {formatDebtAmount(account.balanceBefore)}
                </td>
                <td className="py-1.5 text-end font-semibold">
                  {formatDebtAmount(account.balanceAfter)}
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
