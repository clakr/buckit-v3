import { eq, inArray, type SQLWrapper } from "drizzle-orm";

import type { DB } from "#/db";

import { repayments, transactions, type Bucket, type Debt, type Transaction } from "#/db/schema";
import { ConflictError, InsufficientFundsError, NotFoundError } from "#/lib/errors";
import { describeInsufficientHeld } from "#/lib/money";
import { checkUnallocated } from "#/modules/bank-accounts/figures.server";
import { checkHeld } from "#/modules/buckets/figures.server";
import {
  isRepaymentDateBeforeDebt,
  REPAYMENT_BEFORE_DEBT_MESSAGE,
} from "#/modules/repayments/utils";

type LinkedDebt = Pick<Debt, "id" | "name" | "direction" | "date">;

export type TransactionLink =
  | { kind: "origination" | "repayment"; debt: LinkedDebt }
  | { kind: "withdrawal"; bucket: Pick<Bucket, "id" | "name"> }
  | null;

export type TransactionLocks = { type: boolean; amount: boolean };

export type TransactionEdit = Pick<Transaction, "type" | "amount" | "date" | "note"> & {
  transactionId: Transaction["id"];
};

export const NEGATIVE_UNALLOCATED_MESSAGE =
  "This change would result in a negative unallocated balance. Adjust the amount or add more income first.";

export async function loadTransactionLink(
  db: DB,
  transactionId: Transaction["id"],
): Promise<TransactionLink> {
  const debtColumns = { id: true, name: true, direction: true, date: true } as const;

  const [repayment, fundedDebt, withdrawal] = await Promise.all([
    db.query.repayments.findFirst({
      columns: { id: true },
      where: { transactionId },
      with: { debt: { columns: debtColumns } },
    }),
    db.query.debts.findFirst({
      columns: debtColumns,
      where: { originatingTransactionId: transactionId },
    }),
    db.query.withdrawals.findFirst({
      columns: { id: true },
      where: { transactionId },
      with: { bucket: { columns: { id: true, name: true } } },
    }),
  ]);

  if (withdrawal) return { kind: "withdrawal", bucket: withdrawal.bucket };
  if (repayment) return { kind: "repayment", debt: repayment.debt };
  if (fundedDebt) return { kind: "origination", debt: fundedDebt };

  return null;
}

export function getTransactionLocks(link: TransactionLink): TransactionLocks {
  return { type: link !== null, amount: link?.kind === "origination" };
}

function checkLinkRules(
  link: TransactionLink,
  current: Pick<Transaction, "type" | "amount">,
  edit: TransactionEdit,
) {
  if (!link) return null;

  const locks = getTransactionLocks(link);

  if (locks.type && edit.type !== current.type)
    return link.kind === "withdrawal"
      ? `This transaction is a withdrawal from ${link.bucket.name}, so its type can't change.`
      : `This transaction is linked to ${link.debt.name}'s debt, so its type can't change.`;

  if (link.kind === "withdrawal") return null;

  if (locks.amount && edit.amount !== current.amount)
    return `This transaction funded ${link.debt.name}'s debt, so its amount can't change. To correct it, delete the debt and record it again.`;

  if (link.kind === "repayment" && isRepaymentDateBeforeDebt(edit.date, link.debt.date))
    return REPAYMENT_BEFORE_DEBT_MESSAGE;

  return null;
}

export async function assertTransactionEditAllowed(db: DB, userId: string, edit: TransactionEdit) {
  const [current, link] = await Promise.all([
    db.query.transactions.findFirst({
      columns: { type: true, amount: true, bankAccountId: true },
      where: { id: edit.transactionId },
    }),
    loadTransactionLink(db, edit.transactionId),
  ]);

  if (!current) throw new NotFoundError("This transaction doesn't exist or may have been deleted.");

  const message = checkLinkRules(link, current, edit);
  if (message) throw new ConflictError(message);

  if (link?.kind === "withdrawal")
    return assertWithdrawalAmountHeld(db, userId, link, current, edit);

  return assertUnallocatedNotNegative(db, userId, edit);
}

async function assertUnallocatedNotNegative(db: DB, userId: string, edit: TransactionEdit) {
  const unallocated = await checkUnallocated(db, userId, {
    kind: "replace-transaction",
    transactionId: edit.transactionId,
    type: edit.type,
    amount: edit.amount,
  });

  if (!unallocated.ok) throw new InsufficientFundsError(NEGATIVE_UNALLOCATED_MESSAGE);
}

async function assertWithdrawalAmountHeld(
  db: DB,
  userId: string,
  link: Extract<TransactionLink, { kind: "withdrawal" }>,
  current: Pick<Transaction, "amount" | "bankAccountId">,
  edit: TransactionEdit,
) {
  const increase = edit.amount - current.amount;
  if (increase <= 0) return;

  const held = await checkHeld(db, userId, {
    bucketId: link.bucket.id,
    bankAccountId: current.bankAccountId,
    reduction: increase,
  });

  if (held.ok) return;

  throw new InsufficientFundsError(
    describeInsufficientHeld({
      bucket: held.bucket,
      bankAccount: held.bankAccount,
      availableCents: current.amount + held.available,
    }),
  );
}

export function updateTransaction(db: DB, edit: TransactionEdit) {
  return db
    .update(transactions)
    .set({ type: edit.type, amount: edit.amount, date: edit.date, note: edit.note })
    .where(eq(transactions.id, edit.transactionId))
    .returning();
}

export function isRepaymentBackedBy(transactionIds: SQLWrapper | Transaction["id"][]) {
  return inArray(repayments.transactionId, transactionIds);
}

export function describeLinkedTransactionDeletion(link: TransactionLink) {
  if (link?.kind === "withdrawal")
    return `Its withdrawal from ${link.bucket.name} will be removed too, so the money goes back into the bucket.`;

  if (link?.kind === "repayment")
    return `Its repayment on ${link.debt.name}'s debt will be removed too, so the outstanding goes back up.`;

  if (link?.kind === "origination")
    return `${link.debt.name}'s debt will stay, with no source account.`;

  return "";
}
