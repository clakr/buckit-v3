import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";

import type { DB } from "#/db";
import type { RepaymentEntry } from "#/modules/debts/figures.server";

import {
  debts,
  repayments,
  transactions,
  type BankAccount,
  type Debt,
  type Repayment,
  type Transaction,
} from "#/db/schema";
import { ConflictError, InsufficientFundsError, NotFoundError } from "#/lib/errors";
import { describeInsufficientUnallocated } from "#/lib/money";
import { checkUnallocated } from "#/modules/bank-accounts/figures.server";
import { findOwnedBankAccount } from "#/modules/bank-accounts/ownership.server";
import { getLinkedTransactionType } from "#/modules/debts/utils";
import { checkTransactionEdit, updateTransaction } from "#/modules/transactions/linked.server";

import { isRepaymentDateBeforeDebt, REPAYMENT_BEFORE_DEBT_MESSAGE } from "./utils";

// A Repayment is stored one of two ways, never both: logged through a Bank Account, its Linked
// Transaction holds the amount, date and note; logged without one, the repayment row does. This is
// the one place that knows which, on the way in and on the way out.

/** What a repayment records, in database amounts. */
type RepaymentValues = Pick<Transaction, "amount" | "date" | "note">;

/** A stored repayment with its Linked Transaction, as the figures module loads it. */
type StoredRepayment = Pick<Repayment, "id" | "amount" | "date" | "note" | "createdAt"> & {
  transaction:
    | (Pick<Transaction, "amount" | "date" | "note"> & {
        bankAccount: Pick<BankAccount, "id" | "name"> | null;
      })
    | null;
};

/** A repayment as it reads, whichever way it's stored. */
export function toRepaymentEntry({ transaction, ...repayment }: StoredRepayment): RepaymentEntry {
  return {
    id: repayment.id,
    amount: transaction?.amount ?? repayment.amount ?? 0,
    date: transaction?.date ?? repayment.date ?? repayment.createdAt,
    note: transaction?.note ?? repayment.note,
    bankAccount: transaction?.bankAccount ?? null,
    createdAt: repayment.createdAt,
  };
}

async function checkRepaymentBankAccount(
  db: DB,
  userId: string,
  data: Pick<Transaction, "bankAccountId" | "type" | "amount"> & { currency: Debt["currency"] },
) {
  // The server fns have no bank-account middleware, so this is the account's ownership check.
  const account = await findOwnedBankAccount(db, userId, data.bankAccountId, {
    currency: data.currency,
  });

  // An unusable account isn't a shortfall: wrong currency, missing, or not the user's.
  if (!account) throw new NotFoundError("The selected account is invalid for this repayment.");

  const check = await checkUnallocated(db, userId, {
    kind: "add-transaction",
    bankAccountId: data.bankAccountId,
    type: data.type,
    amount: data.amount,
  });

  if (!check.ok) {
    throw new InsufficientFundsError(
      describeInsufficientUnallocated({
        purpose: "repayment",
        bankAccount: check.bankAccount,
        available: check.available,
      }),
    );
  }
}

/**
 * Logs a repayment against the user's Debt: through `bankAccountId` as a Linked Transaction, or
 * without one as a pure record. Reopens the Debt if it was forgiven.
 */
export async function addRepayment(
  db: DB,
  userId: string,
  input: RepaymentValues & { debtId: Debt["id"]; bankAccountId: BankAccount["id"] | null },
) {
  const debt = await db.query.debts.findFirst({
    where: { id: input.debtId, userId },
    columns: { direction: true, currency: true, date: true },
  });
  if (!debt) throw new NotFoundError("This debt doesn't exist or may have been deleted.");

  if (isRepaymentDateBeforeDebt(input.date, debt.date)) {
    throw new ConflictError(REPAYMENT_BEFORE_DEBT_MESSAGE);
  }

  // A genuine payment must not be swallowed by a "closed" status, so logging one
  // reopens a forgiven Debt in the same batch.
  const reopenDebtQuery = db
    .update(debts)
    .set({ forgivenAt: null })
    .where(eq(debts.id, input.debtId));

  if (!input.bankAccountId) {
    const [repaymentRows] = await db.batch([
      db
        .insert(repayments)
        .values({
          id: uuidv7(),
          debtId: input.debtId,
          amount: input.amount,
          date: input.date,
          note: input.note,
        })
        .returning(),
      reopenDebtQuery,
    ]);

    return repaymentRows[0];
  }

  const type = getLinkedTransactionType(debt.direction, "repayment");

  await checkRepaymentBankAccount(db, userId, {
    bankAccountId: input.bankAccountId,
    currency: debt.currency,
    type,
    amount: input.amount,
  });

  const transactionId = uuidv7();

  const [, repaymentRows] = await db.batch([
    db.insert(transactions).values({
      id: transactionId,
      bankAccountId: input.bankAccountId,
      type,
      amount: input.amount,
      date: input.date,
      note: input.note,
    }),
    db.insert(repayments).values({ id: uuidv7(), debtId: input.debtId, transactionId }).returning(),
    reopenDebtQuery,
  ]);

  return repaymentRows[0];
}

/**
 * Corrects what a repayment recorded, wherever it's stored. A Linked Transaction is edited under
 * the same rules and Unallocated check as an edit from the account page.
 */
export async function changeRepayment(
  db: DB,
  userId: string,
  input: RepaymentValues & { debtId: Debt["id"]; repaymentId: Repayment["id"] },
) {
  // Scoped by `debtId` and its owner, so a repayment id can't be reached through another Debt.
  const repayment = await db.query.repayments.findFirst({
    where: { id: input.repaymentId, debtId: input.debtId, debt: { userId } },
    columns: { id: true },
    with: {
      debt: { columns: { date: true } },
      transaction: { columns: { id: true, type: true } },
    },
  });
  // `debt` is only nullable in the relation's type; `debtId` is NOT NULL.
  if (!repayment?.debt) {
    throw new NotFoundError("This repayment doesn't exist or may have been deleted.");
  }

  if (isRepaymentDateBeforeDebt(input.date, repayment.debt.date)) {
    throw new ConflictError(REPAYMENT_BEFORE_DEBT_MESSAGE);
  }

  if (!repayment.transaction) {
    const [updated] = await db
      .update(repayments)
      .set({ amount: input.amount, date: input.date, note: input.note })
      .where(eq(repayments.id, repayment.id))
      .returning();

    return updated;
  }

  const edit = {
    transactionId: repayment.transaction.id,
    type: repayment.transaction.type,
    amount: input.amount,
    date: input.date,
    note: input.note,
  };
  const check = await checkTransactionEdit(db, userId, edit);

  if (!check.ok) {
    throw check.reason === "linked"
      ? new ConflictError(check.message)
      : new InsufficientFundsError(check.message);
  }

  await updateTransaction(db, edit);

  return repayment;
}
