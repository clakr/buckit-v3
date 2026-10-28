import { sortLedgerMovements } from "#/modules/bank-accounts/ledger";

export type HeldMovement = {
  id: string;
  kind: "allocation" | "withdrawal";
  amount: number;
  date: Date;
  createdAt: Date;
};

export type HeldStep<T extends HeldMovement> = T & { held: number; change: number };

export type HeldBreach = { date: Date };

export function replayHeld<T extends HeldMovement>(
  movements: T[],
  getGroup: (movement: T) => string = () => "",
): HeldStep<T>[] {
  const heldByGroup = new Map<string, number>();

  return sortLedgerMovements(movements, "allocation").map((movement) => {
    const group = getGroup(movement);
    const change = movement.kind === "allocation" ? movement.amount : -movement.amount;
    const held = (heldByGroup.get(group) ?? 0) + change;
    heldByGroup.set(group, held);

    return { ...movement, held, change };
  });
}

export function findFirstHeldBreach(steps: HeldStep<HeldMovement>[]): HeldBreach | null {
  const breach = steps.find(({ held }) => held < 0);

  return breach ? { date: breach.date } : null;
}
