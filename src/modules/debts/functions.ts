import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { uuidv7 } from "uuidv7";

import { getDB } from "#/db";
import { debts, transactions } from "#/db/schema";
import { currencyCodec } from "#/lib/codecs";
import { authMiddleware } from "#/lib/middlewares";
import { recordDebtSchema } from "#/modules/debts/schemas";

export const getDebts = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDB(env.db);

    return db.query.debts.findMany({
      where: {
        userId: context.user.id,
      },
    });
  });

export const recordDebt = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .validator(recordDebtSchema)
  .handler(async ({ context, data }) => {
    const db = getDB(env.db);
    const debtId = uuidv7();

    const amount = currencyCodec.decode(data.amount);

    if (data.direction === "payable" || !data.bankAccountId) {
      const [debt] = await db
        .insert(debts)
        .values({
          id: debtId,
          userId: context.user.id,
          direction: data.direction,
          currency: data.currency,
          amount,
          name: data.name,
        })
        .returning();

      return debt;
    }

    // Re-verify ownership and currency here rather than trusting the client-picked
    // id — never take a bankAccountId at face value.
    const account = await db.query.bankAccounts.findFirst({
      where: {
        id: data.bankAccountId,
        userId: context.user.id,
        currency: data.currency,
      },
      columns: { id: true },
    });
    if (!account) {
      throw new Error("The source account is invalid for this debt.");
    }

    const transactionId = uuidv7();

    const [, debtRows] = await db.batch([
      db.insert(transactions).values({
        id: transactionId,
        bankAccountId: data.bankAccountId,
        type: "expense",
        amount,
        note: `Loan to "${data.name}"`,
      }),
      db
        .insert(debts)
        .values({
          id: debtId,
          originatingTransactionId: transactionId,
          userId: context.user.id,
          direction: data.direction,
          currency: data.currency,
          amount,
          name: data.name,
        })
        .returning(),
    ]);

    return debtRows[0];
  });
