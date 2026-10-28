import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { uuidv7 } from "uuidv7";

import { getDB } from "#/db";
import { distributionLines, distributions } from "#/db/schema";
import { ConflictError, NotFoundError } from "#/lib/errors";
import { authMiddleware } from "#/modules/authentication/middlewares";
import { findOwnedBankAccount } from "#/modules/bank-accounts/ownership.server";
import { distributionNameRule } from "#/modules/distributions/name.server";
import {
  createDistributionSchema,
  validateDistributionNameSchema,
} from "#/modules/distributions/schemas";

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
