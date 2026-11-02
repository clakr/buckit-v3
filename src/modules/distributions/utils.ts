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

export function getLineCents(value: DistributionLineValue, amountCents: number) {
  if (value.mode === "fixed") return value.cents;

  return Math.floor(
    (amountCents * value.basisPoints + BASIS_POINTS_IN_WHOLE / 2) / BASIS_POINTS_IN_WHOLE,
  );
}

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
    writtenLines: plannedLines.filter((line) => line.cents > 0),
    bucketAndPayableTotal,
    receivableTotal,
    salaryCents: amountCents - receivableTotal,
    remainingCents: amountCents - bucketAndPayableTotal,
    exceedsBucketAndPayable: bucketAndPayableTotal > amountCents,
    exceedsReceivable: receivableTotal > amountCents,
  };
}

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

export type DistributionLineTarget =
  | { kind: "bucket"; bucketId: string }
  | { kind: "debt"; debtId: string; direction: "receivable" | "payable" };

export type DistributionLineDraft = DistributionLineTarget & {
  mode: "fixed" | "percent";
  value: unknown;
};

export function getLineTargetId(
  target: { kind: "bucket"; bucketId: string } | { kind: "debt"; debtId: string },
) {
  return target.kind === "bucket" ? target.bucketId : target.debtId;
}

export function getPlanLineKind(target: DistributionLineTarget): DistributionLineKind {
  return target.kind === "bucket" ? "bucket" : target.direction;
}

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
  overpaidByCents: number | null;
};

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
