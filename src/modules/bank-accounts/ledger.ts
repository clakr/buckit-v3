const DAY_MS = 86_400_000;

export type LedgerMovement = {
  id: string;
  kind: "income" | "expense" | "withdrawal" | "allocation";
  amount: number;
  date: Date;
  createdAt: Date;
};

export type LedgerFigures = { balance: number; unallocated: number };

export type LedgerStep<T extends LedgerMovement> = T & LedgerFigures & { change: LedgerFigures };

export type HistoryBreach = { figure: "balance" | "unallocated"; date: Date };

function getUtcDay(date: Date) {
  return Math.floor(date.getTime() / DAY_MS);
}

function getFiguresDelta({ kind, amount }: Pick<LedgerMovement, "kind" | "amount">): LedgerFigures {
  switch (kind) {
    case "income":
      return { balance: amount, unallocated: amount };
    case "expense":
      return { balance: -amount, unallocated: -amount };
    case "withdrawal":
      return { balance: -amount, unallocated: 0 };
    case "allocation":
      return { balance: 0, unallocated: -amount };
  }
}

type Orderable = Pick<LedgerMovement, "id" | "date" | "createdAt"> & { kind: string };

export function sortLedgerMovements<T extends Orderable>(
  movements: T[],
  inflowKind: string = "income",
): T[] {
  return [...movements].sort(
    (a, b) =>
      getUtcDay(a.date) - getUtcDay(b.date) ||
      Number(b.kind === inflowKind) - Number(a.kind === inflowKind) ||
      a.createdAt.getTime() - b.createdAt.getTime() ||
      a.id.localeCompare(b.id),
  );
}

export function replayLedger<T extends LedgerMovement>(
  startingBalance: number,
  movements: T[],
): LedgerStep<T>[] {
  let balance = startingBalance;
  let unallocated = startingBalance;

  return sortLedgerMovements(movements).map((movement) => {
    const delta = getFiguresDelta(movement);
    balance += delta.balance;
    unallocated += delta.unallocated;

    return { ...movement, balance, unallocated, change: delta };
  });
}

export function findFirstBreach(steps: LedgerStep<LedgerMovement>[]): HistoryBreach | null {
  for (const { balance, unallocated, date } of steps) {
    if (balance < 0) return { figure: "balance", date };
    if (unallocated < 0) return { figure: "unallocated", date };
  }

  return null;
}
