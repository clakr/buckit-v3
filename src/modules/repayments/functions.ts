import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { uuidv7 } from "uuidv7";

import { getDB } from "#/db";
import { repayments, transactions } from "#/db/schema";
import { currencyCodec } from "#/lib/codecs";
import { verifyUserBankAccountMiddleware } from "#/modules/bank-accounts/middlewares";
import { getBankAccountUnallocatedBalance } from "#/modules/bank-accounts/utils";

import { verifyUserDebtMiddleware } from "../debts/middlewares";
import { logRepaymentSchema } from "./schemas";

export const validateLogRepaymentCurrency = createServerFn({
  method: "GET",
})
  .middleware([verifyUserBankAccountMiddleware, verifyUserDebtMiddleware])
  .validator(logRepaymentSchema)
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const debt = await db.query.debts.findFirst({
      where: { id: data.debtId },
      columns: { currency: true },
    });
    if (!debt) {
      return { isValid: false, message: "No debt found." };
    }

    const bankAccount = await db.query.bankAccounts.findFirst({
      where: { id: data.bankAccountId },
      columns: { currency: true },
    });
    if (!bankAccount) {
      return { isValid: false, message: "No account found." };
    }

    if (bankAccount.currency !== debt.currency) {
      return {
        isValid: false,
        message: "The selected account's currency doesn't match this debt.",
      };
    }

    return { isValid: true, message: "ok" };
  });

export const validateLogRepaymentBalance = createServerFn({
  method: "GET",
})
  .middleware([verifyUserBankAccountMiddleware, verifyUserDebtMiddleware])
  .validator(logRepaymentSchema)
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const debt = await db.query.debts.findFirst({
      where: { id: data.debtId },
      columns: { direction: true },
    });
    if (!debt) {
      return { isValid: false, message: "No debt found." };
    }

    // A `receivable` repayment is income — it can never push the account negative.
    if (debt.direction === "receivable") {
      return { isValid: true, message: "ok" };
    }

    const bankAccount = await db.query.bankAccounts.findFirst({
      where: { id: data.bankAccountId },
      columns: { startingBalance: true },
      with: {
        transactions: { columns: { type: true, amount: true } },
        allocations: { columns: { amount: true } },
      },
    });
    if (!bankAccount) {
      return { isValid: false, message: "No account found." };
    }

    const { unallocated } = getBankAccountUnallocatedBalance({
      startingBalance: bankAccount.startingBalance,
      transactions: bankAccount.transactions,
      allocations: bankAccount.allocations,
    });

    if (unallocated - currencyCodec.decode(data.amount) < 0) {
      return {
        isValid: false,
        message:
          "This repayment would result in a negative unallocated balance. Adjust the amount or add more income first.",
      };
    }

    return { isValid: true, message: "ok" };
  });

export const logRepayment = createServerFn({
  method: "POST",
})
  .middleware([verifyUserBankAccountMiddleware, verifyUserDebtMiddleware])
  .validator(logRepaymentSchema)
  .handler(async ({ data }) => {
    const db = getDB(env.db);

    const { isValid: isCurrencyValid, message: currencyMessage } =
      await validateLogRepaymentCurrency({ data });
    if (!isCurrencyValid) throw new Error(currencyMessage);

    const { isValid: isBalanceValid, message: balanceMessage } = await validateLogRepaymentBalance({
      data,
    });
    if (!isBalanceValid) throw new Error(balanceMessage);

    const debt = await db.query.debts.findFirst({
      where: { id: data.debtId },
      columns: { direction: true },
    });
    if (!debt) throw new Error("No debt found.");

    const amount = currencyCodec.decode(data.amount);
    const type = debt.direction === "receivable" ? "income" : "expense";

    const transactionId = uuidv7();

    const [, repaymentRows] = await db.batch([
      db.insert(transactions).values({
        id: transactionId,
        bankAccountId: data.bankAccountId,
        type,
        amount,
        date: data.date,
        note: data.note,
      }),
      db
        .insert(repayments)
        .values({
          id: uuidv7(),
          debtId: data.debtId,
          transactionId,
        })
        .returning(),
    ]);

    return repaymentRows[0];
  });
