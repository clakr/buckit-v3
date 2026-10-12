import type { BankAccount } from "#/db/schema";
import type { getBankAccountLinkedDebts } from "#/modules/debts/functions";

import { currencyCodec } from "#/lib/codecs";
import { formatCurrency } from "#/lib/utils";
import { getDebtOutstanding, getDebtStatus } from "#/modules/debts/utils";
import { getRepaymentAmount } from "#/modules/repayments/utils";

type Props = {
  bankAccountId: BankAccount["id"];
  debts: Awaited<ReturnType<typeof getBankAccountLinkedDebts>>;
};

// A Bank Account deletion takes the repayments logged through it with it, and orphans
// any Debt it funded — listed here so a reopened Debt afterward isn't a surprise.
export function BankAccountDeletionDebtsItem({ bankAccountId, debts }: Props) {
  if (!debts.length) return null;

  return (
    <li>
      <b>{debts.length}</b> {debts.length === 1 ? "debt" : "debts"} will be affected:
      <ul className="ms-4 list-inside list-disc">
        {debts.map((debt) => {
          function formatDebtAmount(value: number) {
            return formatCurrency(currencyCodec.encode(value), { currency: debt.currency });
          }

          const removedRepayments = debt.repayments.filter(
            (r) => r.transaction?.bankAccountId === bankAccountId,
          );
          const remainingRepayments = debt.repayments.filter(
            (r) => r.transaction?.bankAccountId !== bankAccountId,
          );
          const removedTotal = removedRepayments.reduce((acc, r) => acc + getRepaymentAmount(r), 0);

          const statusBefore = getDebtStatus(debt);
          const statusAfter = getDebtStatus({ ...debt, repayments: remainingRepayments });

          const isOrphaned = debt.originatingTransaction?.bankAccountId === bankAccountId;

          return (
            <li key={debt.id}>
              "{debt.name}" -{" "}
              {removedRepayments.length ? (
                <>
                  <b>{removedRepayments.length}</b>{" "}
                  {removedRepayments.length === 1 ? "repayment" : "repayments"} totaling{" "}
                  <b className="font-semibold">{formatDebtAmount(removedTotal)}</b> will be removed,
                  raising what's outstanding from {formatDebtAmount(getDebtOutstanding(debt))} to{" "}
                  <b className="font-semibold">
                    {formatDebtAmount(
                      getDebtOutstanding({ ...debt, repayments: remainingRepayments }),
                    )}
                  </b>
                  {statusBefore === statusAfter ? null : (
                    <>
                      {" "}
                      and changing it from <span className="capitalize">{statusBefore}</span> to{" "}
                      <b className="font-semibold capitalize">{statusAfter}</b>
                    </>
                  )}
                  .{isOrphaned ? " " : null}
                </>
              ) : null}
              {isOrphaned
                ? "The transaction that funded this loan will be deleted. The debt stays, with no source account."
                : null}
            </li>
          );
        })}
      </ul>
    </li>
  );
}
