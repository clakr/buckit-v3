import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { uuidv7 } from "uuidv7";

import type { DB } from "#/db";

import { getDB } from "#/db";
import { allocations, distributionLines, distributions, transactions } from "#/db/schema";
import { ConflictError, InsufficientFundsError, NotFoundError } from "#/lib/errors";
import { describeInsufficientUnallocated } from "#/lib/money";
import { authMiddleware } from "#/modules/authentication/middlewares";
import { checkUnallocated, type BankAccountChange } from "#/modules/bank-accounts/figures.server";
import { findOwnedBankAccount } from "#/modules/bank-accounts/ownership.server";
import { getDebtsWithFigures } from "#/modules/debts/figures.server";
import { getLinkedTransactionType } from "#/modules/debts/utils";
import { verifyUserDistributionMiddleware } from "#/modules/distributions/middlewares";
import { distributionNameRule } from "#/modules/distributions/name.server";
import {
  createDistributionSchema,
  triggerDistributionSchema,
  validateDistributionNameSchema,
} from "#/modules/distributions/schemas";
import { assertOwnedLineTargets } from "#/modules/distributions/targets.server";
import {
  computeDistributionPlan,
  getDebtLineWarnings,
  getLineTargetId,
  type DistributionPlanLine,
} from "#/modules/distributions/utils";
import { buildRepaymentStatements } from "#/modules/repayments/storage.server";
import {
  isRepaymentDateBeforeDebt,
  REPAYMENT_BEFORE_DEBT_MESSAGE,
} from "#/modules/repayments/utils";

export const getDistributions = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDB(env.db);

    const rows = await db.query.distributions.findMany({
      where: { userId: context.userId },
      columns: { id: true, name: true, amount: true, createdAt: true },
      with: {
        bankAccount: { columns: { id: true, name: true, currency: true } },
        lines: {
          columns: { id: true, amount: true, basisPoints: true },
          with: {
            bucket: { columns: { id: true, name: true } },
            debt: { columns: { id: true, name: true, direction: true } },
          },
        },
      },
    });

    return rows
      .map(({ lines, ...distribution }) => ({
        ...distribution,
        lines: lines
          .map(({ bucket, debt, ...line }) => ({
            ...line,
            kind: (debt?.direction ?? "bucket") as DistributionPlanLine["kind"],
            targetId: bucket?.id ?? debt?.id ?? "",
            targetName: bucket?.name ?? debt?.name ?? "",
          }))
          .sort((a, b) => a.targetName.localeCompare(b.targetName)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

export const validateDistributionName = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .validator(validateDistributionNameSchema)
  .handler(async ({ context, data }) =>
    distributionNameRule.check(getDB(env.db), context.userId, {
      name: data.name,
      excludeId: data.excludeId,
    }),
  );

export const createDistribution = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .validator(createDistributionSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const { isValid, message } = await distributionNameRule.check(db, context.userId, {
      name: data.name,
    });

    if (!isValid) throw new ConflictError(message);

    const bankAccount = await findOwnedBankAccount(db, context.userId, data.bankAccountId);
    if (!bankAccount)
      throw new NotFoundError("This account doesn't exist or may have been deleted.");

    const debts = await assertOwnedLineTargets(db, context.userId, bankAccount, {
      bucketIds: data.lines.flatMap((line) => (line.kind === "bucket" ? [line.bucketId] : [])),
      debtIds: data.lines.flatMap((line) => (line.kind === "debt" ? [line.debtId] : [])),
    });

    // The form's own direction is a hint. The blocking rules use the Debts' stored directions.
    const plan = computeDistributionPlan(
      data.lines.map((line) => ({
        id: getLineTargetId(line),
        kind: line.kind === "bucket" ? ("bucket" as const) : getDebtDirection(debts, line.debtId),
        value:
          line.mode === "fixed"
            ? { mode: "fixed" as const, cents: line.value }
            : { mode: "percent" as const, basisPoints: line.value },
      })),
      data.amount,
    );
    assertPlanFits(plan, "default amount");

    const distributionId = uuidv7();

    // One batch is one D1 transaction, so a failed line insert never leaves the Distribution behind.
    const [distributionRows] = await distributionNameRule.write(
      db.batch([
        db
          .insert(distributions)
          .values({
            id: distributionId,
            userId: context.userId,
            bankAccountId: data.bankAccountId,
            name: data.name,
            amount: data.amount,
          })
          .returning(),
        db.insert(distributionLines).values(
          data.lines.map((line) => ({
            id: uuidv7(),
            distributionId,
            bucketId: line.kind === "bucket" ? line.bucketId : null,
            debtId: line.kind === "debt" ? line.debtId : null,
            amount: line.mode === "fixed" ? line.value : null,
            basisPoints: line.mode === "percent" ? line.value : null,
          })),
        ),
      ]),
    );

    return distributionRows[0];
  });

function getDebtDirection(
  debts: { id: string; direction: "receivable" | "payable" }[],
  debtId: string,
) {
  const debt = debts.find(({ id }) => id === debtId);
  if (!debt) throw new Error(`Debt ${debtId} was not loaded.`);

  return debt.direction;
}

function assertPlanFits(
  plan: Pick<
    ReturnType<typeof computeDistributionPlan>,
    "exceedsBucketAndPayable" | "exceedsReceivable"
  >,
  amountLabel: string,
) {
  if (plan.exceedsBucketAndPayable) {
    throw new ConflictError(
      `Bucket and payable lines can't add up to more than the ${amountLabel}.`,
    );
  }
  if (plan.exceedsReceivable) {
    throw new ConflictError(`Receivable lines can't add up to more than the ${amountLabel}.`);
  }
}

// Loads a saved Distribution with everything a trigger or its preview needs, and checks that it,
// its account and every line's target still belong to the User.
async function loadDistributionPlan(
  db: DB,
  userId: string,
  distributionId: string,
  amount: number,
) {
  const distribution = await db.query.distributions.findFirst({
    where: { id: distributionId, userId },
    columns: { id: true, name: true, bankAccountId: true },
    with: {
      lines: {
        columns: { id: true, bucketId: true, debtId: true, amount: true, basisPoints: true },
      },
    },
  });
  if (!distribution)
    throw new NotFoundError("This distribution doesn't exist or may have been deleted.");

  const bankAccount = await findOwnedBankAccount(db, userId, distribution.bankAccountId);
  if (!bankAccount) throw new NotFoundError("This account doesn't exist or may have been deleted.");

  const bucketIds = distribution.lines.flatMap(({ bucketId }) => (bucketId ? [bucketId] : []));
  const debtIds = distribution.lines.flatMap(({ debtId }) => (debtId ? [debtId] : []));

  await assertOwnedLineTargets(db, userId, bankAccount, { bucketIds, debtIds });
  const debts = debtIds.length ? await getDebtsWithFigures(db, { userId, debtIds }) : [];

  const planLines = distribution.lines.map(({ id, bucketId, debtId, amount, basisPoints }) => {
    const targetId = bucketId ?? debtId;
    if (!targetId) throw new Error(`Distribution line ${id} has no target.`);

    const value =
      basisPoints === null
        ? { mode: "fixed" as const, cents: amount ?? 0 }
        : { mode: "percent" as const, basisPoints };

    return {
      id: targetId,
      kind: bucketId ? ("bucket" as const) : getDebtDirection(debts, targetId),
      value,
    };
  });

  return {
    distribution,
    bankAccount,
    debts,
    plan: computeDistributionPlan(planLines, amount),
  };
}

// Reports what a trigger would warn about, without blocking. Debt lines are never capped, so an
// overpayment, a Settled Debt or a Forgiven one that would reopen only shows here.
export const previewDistribution = createServerFn({
  method: "GET",
})
  .middleware([verifyUserDistributionMiddleware])
  .validator(triggerDistributionSchema)
  .handler(async ({ context, data }) => {
    const { debts, plan } = await loadDistributionPlan(
      getDB(env.db),
      context.userId,
      data.distributionId,
      data.amount,
    );

    return { warnings: getDebtLineWarnings(plan.plannedLines, debts) };
  });

// Writes the income, one Allocation per Bucket line and one Repayment per Debt line in a single D1
// batch, so a failure writes nothing. The app keeps no record of the trigger itself (ADR 0007): the
// Distribution's name in each note is the only trace. Warnings never block, so a Debt line is
// applied exactly as written.
export const triggerDistribution = createServerFn({
  method: "POST",
})
  .middleware([verifyUserDistributionMiddleware])
  .validator(triggerDistributionSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const { distribution, bankAccount, debts, plan } = await loadDistributionPlan(
      db,
      context.userId,
      data.distributionId,
      data.amount,
    );

    assertPlanFits(plan, "amount");

    const date = new Date();
    const note = distribution.name;

    const bucketLines = plan.writtenLines.filter((line) => line.kind === "bucket");
    const debtLines = plan.writtenLines.flatMap((line) =>
      line.kind === "bucket" ? [] : [{ ...line, kind: line.kind }],
    );

    for (const line of debtLines) {
      const debt = debts.find(({ id }) => id === line.id);
      if (debt && isRepaymentDateBeforeDebt(date, debt.date)) {
        throw new ConflictError(REPAYMENT_BEFORE_DEBT_MESSAGE);
      }
    }

    const changes: BankAccountChange[] = [
      ...(plan.salaryCents > 0
        ? [
            {
              kind: "add-transaction" as const,
              bankAccountId: bankAccount.id,
              type: "income" as const,
              amount: plan.salaryCents,
              date,
            },
          ]
        : []),
      ...bucketLines.map((line) => ({
        kind: "add-allocation" as const,
        bankAccountId: bankAccount.id,
        amount: line.cents,
        date,
      })),
      ...debtLines.map((line) => ({
        kind: "add-transaction" as const,
        bankAccountId: bankAccount.id,
        type: getLinkedTransactionType(line.kind, "repayment"),
        amount: line.cents,
        date,
      })),
    ];

    const check = await checkUnallocated(db, context.userId, changes);

    if (!check.ok) {
      throw new InsufficientFundsError(
        describeInsufficientUnallocated({
          bankAccount: check.bankAccount,
          availableCents: check.available,
          historyBreach: check.historyBreach,
        }),
      );
    }

    const statements = [
      ...(plan.salaryCents > 0
        ? [
            db.insert(transactions).values({
              id: uuidv7(),
              bankAccountId: bankAccount.id,
              type: "income",
              amount: plan.salaryCents,
              date,
              note,
            }),
          ]
        : []),
      ...bucketLines.map((line) =>
        db.insert(allocations).values({
          id: uuidv7(),
          bankAccountId: bankAccount.id,
          bucketId: line.id,
          amount: line.cents,
          date,
          note,
        }),
      ),
      ...debtLines.flatMap(
        (line) =>
          buildRepaymentStatements(db, {
            debtId: line.id,
            direction: line.kind,
            bankAccountId: bankAccount.id,
            amount: line.cents,
            date,
            note,
          }).statements,
      ),
    ];

    // One batch is one D1 transaction. It is never empty: a zero salary means the `receivable`
    // lines take the whole amount, and the schema keeps the amount above zero.
    await db.batch(statements as [(typeof statements)[number], ...(typeof statements)[number][]]);
  });
