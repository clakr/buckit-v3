import { IconBuildingBank, IconTrash } from "@tabler/icons-react";

import type { getBankAccounts } from "#/modules/bank-accounts/functions";
import type { getDebt } from "#/modules/debts/functions";

import { currencyCodec } from "#/lib/codecs";
import { formatCurrency } from "#/lib/utils";
import { getBankAccountUnallocatedBalance } from "#/modules/bank-accounts/utils";

type Props = {
  debt: NonNullable<Awaited<ReturnType<typeof getDebt>>>;
  bankAccounts: Awaited<ReturnType<typeof getBankAccounts>>;
  deleteTransactions: boolean;
};

// Same shape as `BankAccountDeletionSummary`: what's deleted in one sentence, then what
// survives but changes. Here that's each linked account's balance, and only when the
// linked Transactions are deleted too — keeping them changes nothing outside the Debt.
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
      const { balance } = getBankAccountUnallocatedBalance(account);

      return {
        id: account.id,
        name: account.name,
        balanceBefore: balance,
        balanceAfter: balance + (balanceChangeByBankAccountId.get(account.id) ?? 0),
      };
    });

  const repaymentCount = debt.repayments.length;
  const transactionCount = linkedTransactions.length;
  const deletedParts = [
    repaymentCount
      ? `${repaymentCount} ${repaymentCount === 1 ? "repayment" : "repayments"}`
      : null,
    deleteTransactions && transactionCount
      ? `${transactionCount} linked ${transactionCount === 1 ? "transaction" : "transactions"}`
      : null,
  ].filter(Boolean);

  const bankAccountsLabel = [...new Set(linkedTransactions.map((t) => t.bankAccount.name))]
    .map((name) => `"${name}"`)
    .join(", ");

  return (
    <div className="flex flex-col gap-y-3">
      <p className="flex items-start gap-x-1.5 rounded-md bg-destructive/5 px-3 py-2 text-destructive">
        <IconTrash className="mt-px size-4 shrink-0" />
        <span>
          Deletes the debt with "{debt.name}"
          {deletedParts.length ? ` with its ${deletedParts.join(" and ")}` : ""}.
        </span>
      </p>
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
                <td className="py-1.5 text-end font-medium">
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
