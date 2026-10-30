/** What a line points at. A `receivable` or `payable` is a Debt line, named for the Debt's direction. */
export type DistributionLineKind = "bucket" | "receivable" | "payable";

export type DistributionLineValue =
  | { mode: "fixed"; cents: number }
  | { mode: "percent"; basisPoints: number };

export type DistributionPlanLine<Id extends string = string> = {
  id: Id;
  kind: DistributionLineKind;
  value: DistributionLineValue;
};

const BASIS_POINTS_IN_WHOLE = 10_000;

export function toCents(input: string | number) {
  const parsed = typeof input === "number" ? input : Number.parseFloat(input);

  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function toBasisPoints(input: string | number) {
  return toCents(input);
}

/** A percentage line is that share of the whole amount, rounded half up to the centavo. */
export function getLineCents(value: DistributionLineValue, amountCents: number) {
  if (value.mode === "fixed") return value.cents;

  return Math.floor(
    (amountCents * value.basisPoints + BASIS_POINTS_IN_WHOLE / 2) / BASIS_POINTS_IN_WHOLE,
  );
}

/**
 * Works out every line, and the two totals the save and trigger rules check. The Bank Account gains
 * `amountCents` once: `receivableTotal` of it is logged as Repayments and the rest as the salary
 * `income`. Bucket lines are Allocations and `payable` lines are `expense` Repayments, so only those
 * two take money out of what the Distribution adds.
 */
export function computeDistributionPlan<Id extends string>(
  lines: DistributionPlanLine<Id>[],
  amountCents: number,
) {
  const plannedLines = lines.map((line) => ({
    ...line,
    cents: getLineCents(line.value, amountCents),
  }));

  const totalOf = (...kinds: DistributionLineKind[]) =>
    plannedLines
      .filter((line) => kinds.includes(line.kind))
      .reduce((sum, line) => sum + line.cents, 0);

  const bucketAndPayableTotal = totalOf("bucket", "payable");
  const receivableTotal = totalOf("receivable");

  return {
    plannedLines,
    /** Lines worth writing. A line that rounds to zero is left out. */
    writtenLines: plannedLines.filter((line) => line.cents > 0),
    bucketAndPayableTotal,
    receivableTotal,
    /** The salary `income`, which is skipped when it is zero. */
    salaryCents: amountCents - receivableTotal,
    /** What stays Unallocated once the Allocations and `payable` Repayments are taken. */
    remainingCents: amountCents - bucketAndPayableTotal,
    exceedsBucketAndPayable: bucketAndPayableTotal > amountCents,
    exceedsReceivable: receivableTotal > amountCents,
  };
}

/** Reads saved lines as plan lines, so the trigger and the index work out the same split. */
export function savedLinesToPlanLines(
  lines: {
    targetId: string;
    kind: DistributionLineKind;
    basisPoints: number | null;
    amount: number | null;
  }[],
): DistributionPlanLine[] {
  return lines.map((line) => ({
    id: line.targetId,
    kind: line.kind,
    value:
      line.basisPoints === null
        ? { mode: "fixed", cents: line.amount ?? 0 }
        : { mode: "percent", basisPoints: line.basisPoints },
  }));
}

/** What a line points at. A Debt line carries its Debt's direction, which decides how it is written. */
export type DistributionLineTarget =
  | { kind: "bucket"; bucketId: string }
  | { kind: "debt"; debtId: string; direction: "receivable" | "payable" };

/** A line as the form holds it: the value is whatever the User has typed so far. */
export type DistributionLineDraft = DistributionLineTarget & {
  mode: "fixed" | "percent";
  value: unknown;
};

export function getLineTargetId(target: DistributionLineTarget) {
  return target.kind === "bucket" ? target.bucketId : target.debtId;
}

export function getPlanLineKind(target: DistributionLineTarget): DistributionLineKind {
  return target.kind === "bucket" ? "bucket" : target.direction;
}

/** Reads the form's drafts forgivingly, so a half-typed value counts as zero instead of throwing. */
export function draftsToPlanLines(drafts: DistributionLineDraft[]): DistributionPlanLine[] {
  return drafts.map((draft) => ({
    id: getLineTargetId(draft),
    kind: getPlanLineKind(draft),
    value:
      draft.mode === "fixed"
        ? { mode: "fixed", cents: toCents(String(draft.value ?? "")) }
        : { mode: "percent", basisPoints: toBasisPoints(String(draft.value ?? "")) },
  }));
}

export type DebtLineWarning = {
  debtId: string;
  kind: "overpays" | "settled" | "forgiven";
  /** What the line pays beyond the Debt's Outstanding. Set only for `overpays`. */
  overpaidByCents: number | null;
};

/**
 * A Debt line never caps itself, so the User is warned instead. A Forgiven Debt is reopened by the
 * Repayment, a Settled one is already paid off, and an open one may be paid more than it owes.
 */
export function getDebtLineWarnings(
  plannedLines: { id: string; kind: DistributionLineKind; cents: number }[],
  debts: { id: string; outstanding: number; status: "open" | "settled" | "forgiven" }[],
): DebtLineWarning[] {
  return plannedLines.flatMap((line): DebtLineWarning[] => {
    if (line.kind === "bucket" || line.cents <= 0) return [];

    const debt = debts.find(({ id }) => id === line.id);
    if (!debt) return [];

    if (debt.status === "forgiven")
      return [{ debtId: debt.id, kind: "forgiven", overpaidByCents: null }];
    if (debt.status === "settled")
      return [{ debtId: debt.id, kind: "settled", overpaidByCents: null }];
    if (line.cents > debt.outstanding)
      return [
        {
          debtId: debt.id,
          kind: "overpays",
          overpaidByCents: line.cents - debt.outstanding,
        },
      ];

    return [];
  });
}
