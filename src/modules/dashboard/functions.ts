import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

import { getDB } from "#/db";
import { authMiddleware } from "#/modules/authentication/middlewares";
import { getBankAccountsWithFiguresAndTrend } from "#/modules/bank-accounts/figures.server";
import { getCurrencySummaries } from "#/modules/dashboard/utils";
import { getDebtsWithFigures } from "#/modules/debts/figures.server";

export const getDashboard = createServerFn({
  method: "GET",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDB(env.db);

    const [bankAccounts, debts] = await Promise.all([
      getBankAccountsWithFiguresAndTrend(db, { userId: context.userId }),
      getDebtsWithFigures(db, { userId: context.userId }),
    ]);

    return { currencySummaries: getCurrencySummaries(bankAccounts, debts) };
  });
