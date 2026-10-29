import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { uuidv7 } from "uuidv7";

import { getDB } from "#/db";
import { allocations, distributionLines, distributions, transactions } from "#/db/schema";
import { ConflictError, InsufficientFundsError, NotFoundError } from "#/lib/errors";
import { describeInsufficientUnallocated } from "#/lib/money";
import { authMiddleware } from "#/modules/authentication/middlewares";
import { checkUnallocated } from "#/modules/bank-accounts/figures.server";
import { findOwnedBankAccount } from "#/modules/bank-accounts/ownership.server";
import { verifyUserDistributionMiddleware } from "#/modules/distributions/middlewares";
import { distributionNameRule } from "#/modules/distributions/name.server";
import {
  createDistributionSchema,
  triggerDistributionSchema,
  validateDistributionNameSchema,
} from "#/modules/distributions/schemas";
import { computeDistributionPlan } from "#/modules/distributions/utils";

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
          with: { bucket: { columns: { id: true, name: true } } },
        },
      },
    });

    return rows
      .map(({ lines, ...distribution }) => ({
        ...distribution,
        lines: lines
          .map(({ bucket, ...line }) => ({ ...line, bucketName: bucket?.name ?? "" }))
          .sort((a, b) => a.bucketName.localeCompare(b.bucketName)),
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

    const bucketIds = data.lines.map((line) => line.bucketId);

    const [bankAccount, ownedBuckets] = await Promise.all([
      findOwnedBankAccount(db, context.userId, data.bankAccountId),
      db.query.buckets.findMany({
        where: { userId: context.userId, id: { in: bucketIds } },
        columns: { id: true },
      }),
    ]);

    if (!bankAccount)
      throw new NotFoundError("This account doesn't exist or may have been deleted.");
    if (ownedBuckets.length !== bucketIds.length) {
      throw new NotFoundError("One of these buckets doesn't exist or may have been deleted.");
    }

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
            bucketId: line.bucketId,
            amount: line.mode === "fixed" ? line.value : null,
            basisPoints: line.mode === "percent" ? line.value : null,
          })),
        ),
      ]),
    );

    return distributionRows[0];
  });

// Writes the income and one Allocation per Bucket line in a single D1 batch, so a failure writes
// nothing. The app keeps no record of the trigger itself (ADR 0007): the Distribution's name in each
// note is the only trace.
export const triggerDistribution = createServerFn({
  method: "POST",
})
  .middleware([verifyUserDistributionMiddleware])
  .validator(triggerDistributionSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);

    const distribution = await db.query.distributions.findFirst({
      where: { id: data.distributionId, userId: context.userId },
      columns: { id: true, name: true, bankAccountId: true },
      with: { lines: { columns: { id: true, bucketId: true, amount: true, basisPoints: true } } },
    });
    if (!distribution)
      throw new NotFoundError("This distribution doesn't exist or may have been deleted.");

    const bucketLines = distribution.lines.map(({ id, bucketId, amount, basisPoints }) => {
      if (!bucketId) throw new Error(`Distribution line ${id} has no Bucket.`);

      return {
        bucketId,
        value:
          basisPoints === null
            ? { mode: "fixed" as const, cents: amount ?? 0 }
            : { mode: "percent" as const, basisPoints },
      };
    });

    const [bankAccount, ownedBuckets] = await Promise.all([
      findOwnedBankAccount(db, context.userId, distribution.bankAccountId),
      db.query.buckets.findMany({
        where: { userId: context.userId, id: { in: bucketLines.map((line) => line.bucketId) } },
        columns: { id: true },
      }),
    ]);

    if (!bankAccount)
      throw new NotFoundError("This account doesn't exist or may have been deleted.");
    if (ownedBuckets.length !== bucketLines.length) {
      throw new NotFoundError("One of these buckets doesn't exist or may have been deleted.");
    }

    const plan = computeDistributionPlan(
      bucketLines.map((line) => ({
        id: line.bucketId,
        kind: "bucket" as const,
        value: line.value,
      })),
      data.amount,
    );

    if (plan.exceedsBucketAndPayable) {
      throw new ConflictError("Bucket lines can't add up to more than the amount.");
    }

    const date = new Date();

    const incomeChanges = plan.salaryCents
      ? [
          {
            kind: "add-transaction" as const,
            bankAccountId: bankAccount.id,
            type: "income" as const,
            amount: plan.salaryCents,
            date,
          },
        ]
      : [];

    const check = await checkUnallocated(db, context.userId, [
      ...incomeChanges,
      ...plan.writtenLines.map((line) => ({
        kind: "add-allocation" as const,
        bankAccountId: bankAccount.id,
        amount: line.cents,
        date,
      })),
    ]);

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
      ...incomeChanges.map(({ type, amount }) =>
        db.insert(transactions).values({
          id: uuidv7(),
          bankAccountId: bankAccount.id,
          type,
          amount,
          date,
          note: distribution.name,
        }),
      ),
      ...plan.writtenLines.map((line) =>
        db.insert(allocations).values({
          id: uuidv7(),
          bankAccountId: bankAccount.id,
          bucketId: line.id,
          amount: line.cents,
          date,
          note: distribution.name,
        }),
      ),
    ];

    // One batch is one D1 transaction. `statements` always holds the income: Bucket lines never
    // take money out of it, so the salary equals the amount, which the schema keeps above zero.
    await db.batch(statements as [(typeof statements)[number], ...(typeof statements)[number][]]);
  });
