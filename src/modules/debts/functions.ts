import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { uuidv7 } from "uuidv7";

import { getDB } from "#/db";
import { debts } from "#/db/schema";
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

    return db
      .insert(debts)
      .values({
        id: uuidv7(),
        userId: context.session.userId,
        direction: data.direction,
        currency: data.currency,
        amount: currencyCodec.decode(data.amount),
        name: data.name,
      })
      .returning();
  });
