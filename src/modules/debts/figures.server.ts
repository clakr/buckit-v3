import type { DB } from "#/db";
import type { BankAccount, Debt, Repayment } from "#/db/schema";

import { toRepaymentEntry } from "#/modules/repayments/storage.server";

export type DebtStatus = "open" | "settled" | "forgiven";

export type RepaymentEntry = {
  id: Repayment["id"];
  amount: number;
  date: Date;
  note: string | null;
  bankAccount: Pick<BankAccount, "id" | "name"> | null;
  createdAt: Repayment["createdAt"];
};

export type DebtFigures = {
  outstanding: number;
  repaid: number;
  status: DebtStatus;
  lastRepaymentDate: Date | null;
};

export type DebtWithFigures = Debt &
  DebtFigures & {
    originatingBankAccount: Pick<BankAccount, "id" | "name"> | null;
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
        .map(toRepaymentEntry)
        .sort(
          (a, b) =>
            a.date.getTime() - b.date.getTime() || a.createdAt.getTime() - b.createdAt.getTime(),
        ),
    }),
  );
}

export function withoutRepayments(
  debt: DebtWithFigures,
  repaymentIds: ReadonlySet<Repayment["id"]>,
): DebtWithFigures {
  return withFigures({
    ...debt,
    repayments: debt.repayments.filter((entry) => !repaymentIds.has(entry.id)),
  });
}
