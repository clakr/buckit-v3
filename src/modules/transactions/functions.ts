import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { uuidv7 } from "uuidv7";

import { getDB } from "#/db";
import { transactions } from "#/db/schema";
import { authMiddleware } from "#/lib/middlewares";
import { logTransactionSchema } from "#/modules/transactions/schema";

// export const getBankAccounts = createServerFn({
//   method: "GET",
// })
//   .middleware([authMiddleware])
//   .handler(async ({ context }) => {
//     const db = getDB(env.db);
//
//     return db.select().from(bankAccounts).where(eq(bankAccounts.userId, context.user.id));
//   });
//
// export const validateBankAccountName = createServerFn({
//   method: "GET",
// })
//   .middleware([authMiddleware])
//   .validator(z.string())
//   .handler(async ({ context, data }) => {
//     const db = getDB(env.db);
//
//     const result = await db
//       .select({
//         id: bankAccounts.id,
//         name: bankAccounts.name,
//       })
//       .from(bankAccounts)
//       .where(
//         and(
//           eq(bankAccounts.userId, context.session.userId),
//           eq(lower(bankAccounts.name), data.toLowerCase()),
//         ),
//       )
//       .limit(1);
//
//     return result.length === 0;
//   });

export const logTransaction = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .validator(logTransactionSchema)
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    return db
      .insert(transactions)
      .values({
        id: uuidv7(),
        ...data,
      })
      .returning();
  });
