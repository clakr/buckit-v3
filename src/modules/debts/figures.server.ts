import type { DB } from "#/db";
import type { BankAccount, Debt, Repayment } from "#/db/schema";

// Computed on read, never stored — a stored status would go stale the moment a repayment
// disappears through an unrelated code path (e.g. a Bank Account deletion).
export type DebtStatus = "open" | "settled" | "forgiven";

/**
 * A repayment as it reads, whichever way it's stored: logged through a Bank Account, its Linked
 * Transaction holds the amount, date and note; otherwise the repayment row does.
 */
export type RepaymentEntry = {
  id: Repayment["id"];
  amount: number;
  date: Date;
  note: string | null;
  /** The account its Linked Transaction moved money through; `null` for an off-app repayment. */
  bankAccount: Pick<BankAccount, "id" | "name"> | null;
  createdAt: Repayment["createdAt"];
};

export type DebtFigures = {
  /** The amount minus every repayment. Negative when overpaid; forgiving doesn't change it. */
  outstanding: number;
  repaid: number;
  status: DebtStatus;
  lastRepaymentDate: Date | null;
};

export type DebtWithFigures = Debt &
  DebtFigures & {
    /** The account a receivable was lent from; `null` for a payable or an unfunded receivable. */
    originatingBankAccount: Pick<BankAccount, "id" | "name"> | null;
    /** Oldest first, by date, then by when each was logged. */
    repayments: RepaymentEntry[];
  };

type DebtWithEntries = Omit<DebtWithFigures, keyof DebtFigures>;

function withFigures(debt: DebtWithEntries): DebtWithFigures {
  const repaid = debt.repayments.reduce((total, entry) => total + entry.amount, 0);
  const outstanding = debt.amount - repaid;

  return {
    ...debt,
    outstanding,
    repaid,
    status: debt.forgivenAt ? "forgiven" : outstanding <= 0 ? "settled" : "open",
    lastRepaymentDate: debt.repayments.at(-1)?.date ?? null,
  };
}

/**
 * The user's Debts with their figures and resolved repayments. `debtIds` narrows to those Debts;
 * someone else's are left out like missing ones.
 */
export async function getDebtsWithFigures(
  db: DB,
  { userId, debtIds }: { userId: string; debtIds?: Debt["id"][] },
): Promise<DebtWithFigures[]> {
  const bankAccountColumns = { columns: { id: true, name: true } } as const;

  const rows = await db.query.debts.findMany({
    where: { userId, ...(debtIds ? { id: { in: debtIds } } : {}) },
    with: {
      originatingTransaction: { columns: { id: true }, with: { bankAccount: bankAccountColumns } },
      repayments: {
        with: {
          transaction: {
            columns: { amount: true, date: true, note: true },
            with: { bankAccount: bankAccountColumns },
          },
        },
      },
    },
  });

  return rows.map(({ originatingTransaction, repayments, ...debt }) =>
    withFigures({
      ...debt,
      originatingBankAccount: originatingTransaction?.bankAccount ?? null,
      repayments: repayments
        .map(({ transaction, ...repayment }) => ({
          id: repayment.id,
          amount: transaction?.amount ?? repayment.amount ?? 0,
          date: transaction?.date ?? repayment.date ?? repayment.createdAt,
          note: transaction?.note ?? repayment.note,
          bankAccount: transaction?.bankAccount ?? null,
          createdAt: repayment.createdAt,
        }))
        .sort(
          (a, b) =>
            a.date.getTime() - b.date.getTime() || a.createdAt.getTime() - b.createdAt.getTime(),
        ),
    }),
  );
}

/** The same Debt as if those repayments were gone: what a cascade would leave behind. */
export function withoutRepayments(
  debt: DebtWithFigures,
  repaymentIds: ReadonlySet<Repayment["id"]>,
): DebtWithFigures {
  return withFigures({
    ...debt,
    repayments: debt.repayments.filter((entry) => !repaymentIds.has(entry.id)),
  });
}
