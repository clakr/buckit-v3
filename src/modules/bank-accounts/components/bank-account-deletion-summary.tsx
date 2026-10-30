import { IconBucket, IconCredits } from "@tabler/icons-react";

import type { getBankAccountDeletionImpact } from "#/modules/bank-accounts/functions";

import { formatMoney } from "#/lib/money";
import { DebtStatusBadge } from "#/modules/debts/components/debt-status-badge";
import { DistributionDeletionList } from "#/modules/distributions/components/distribution-deletion-list";

type Props = {
  impact: Awaited<ReturnType<typeof getBankAccountDeletionImpact>>;
};

const deletedRecordsList = new Intl.ListFormat("en", { type: "conjunction" });

export function getBankAccountDeletionDescription({ impact }: Props) {
  const {
    bankAccount,
    transactionCount,
    allocationCount,
    removedRepaymentCount,
    removedWithdrawalCount,
  } = impact;

  const deletedRecords = [
    transactionCount
      ? `${transactionCount} ${transactionCount === 1 ? "transaction" : "transactions"}`
      : null,
    allocationCount
      ? `${allocationCount} ${allocationCount === 1 ? "allocation" : "allocations"}`
      : null,
    removedRepaymentCount
      ? `${removedRepaymentCount} debt ${removedRepaymentCount === 1 ? "repayment" : "repayments"}`
      : null,
    removedWithdrawalCount
      ? `${removedWithdrawalCount} bucket ${removedWithdrawalCount === 1 ? "withdrawal" : "withdrawals"}`
      : null,
  ].filter((part) => part !== null);

  return `Permanently delete "${bankAccount.name}"${deletedRecords.length ? ` with its ${deletedRecordsList.format(deletedRecords)}` : ""}. This cannot be undone.`;
}

export function BankAccountDeletionSummary({ impact }: Props) {
  function formatAccountAmount(value: number) {
    return formatMoney(value, impact.bankAccount.currency);
  }

  const { buckets: affectedBuckets, debts: affectedDebts, distributions } = impact;

  const hasChangesElsewhere = affectedBuckets.length > 0 || affectedDebts.length > 0;

  return (
    <div className="flex flex-col gap-y-3 empty:hidden">
      <DistributionDeletionList distributions={distributions} via="bank-account" />
      {hasChangesElsewhere ? (
        <table className="w-full tabular-nums">
          <thead className="text-[0.65rem] tracking-wide text-muted-foreground uppercase">
            <tr className="border-b">
              <th className="py-1 text-start font-medium">Changes elsewhere</th>
              <th className="py-1 text-end font-medium">Before</th>
              <th className="py-1 text-end font-medium">After</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {affectedBuckets.map((bucket) => (
              <tr key={bucket.id}>
                <td className="py-1.5">
                  <span className="flex items-center gap-x-1.5">
                    <IconBucket className="size-4 text-muted-foreground" />
                    {bucket.name}
                  </span>
                </td>
                <td className="py-1.5 text-end text-muted-foreground">
                  {formatAccountAmount(bucket.before)}
                </td>
                <td className="py-1.5 text-end font-semibold">
                  {formatAccountAmount(bucket.after)}
                </td>
              </tr>
            ))}
            {affectedDebts.map((debt) => {
              function formatDebtAmount(value: number) {
                return formatMoney(value, debt.currency);
              }

              const isStatusChanged = debt.statusBefore !== debt.statusAfter;

              return (
                <tr key={debt.id} className="align-top">
                  <td className="py-1.5">
                    <span className="flex items-center gap-x-1.5">
                      <IconCredits className="size-4 text-muted-foreground" />
                      {debt.name}
                    </span>
                    {debt.isOrphaned ? (
                      <span className="ps-5.5 text-muted-foreground">loses its source account</span>
                    ) : null}
                  </td>
                  <td className="py-1.5 text-end text-muted-foreground">
                    <span className="flex flex-col items-end gap-y-0.5">
                      {formatDebtAmount(debt.outstandingBefore)}
                      {isStatusChanged ? <DebtStatusBadge status={debt.statusBefore} /> : null}
                    </span>
                  </td>
                  <td className="py-1.5 text-end font-semibold">
                    <span className="flex flex-col items-end gap-y-0.5">
                      {formatDebtAmount(debt.outstandingAfter)}
                      {isStatusChanged ? <DebtStatusBadge status={debt.statusAfter} /> : null}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
