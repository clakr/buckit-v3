import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

import { getDB } from "#/db";
import { currencyCodec } from "#/lib/codecs";

import { verifyUserDebtMiddleware } from "../debts/middlewares";
import { editRepaymentSchema, logRepaymentSchema } from "./schemas";
import { addRepayment, changeRepayment } from "./storage.server";

// The write is the check: an AppError from the storage module reaches the dialog's failure toast.

export const logRepayment = createServerFn({
  method: "POST",
})
  .middleware([verifyUserDebtMiddleware])
  .validator(logRepaymentSchema)
  .handler(({ context, data }) =>
    addRepayment(getDB(env.db), context.user.id, {
      debtId: data.debtId,
      bankAccountId: data.bankAccountId,
      amount: currencyCodec.decode(data.amount),
      date: data.date,
      note: data.note,
    }),
  );

export const editRepayment = createServerFn({
  method: "POST",
})
  .middleware([verifyUserDebtMiddleware])
  .validator(editRepaymentSchema)
  .handler(({ context, data }) =>
    changeRepayment(getDB(env.db), context.user.id, {
      debtId: data.debtId,
      repaymentId: data.repaymentId,
      amount: currencyCodec.decode(data.amount),
      date: data.date,
      note: data.note,
    }),
  );
