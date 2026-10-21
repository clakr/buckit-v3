import { eq, inArray, type SQLWrapper } from "drizzle-orm";

import type { DB } from "#/db";

import { repayments, transactions, type Debt, type Transaction } from "#/db/schema";
import { NotFoundError } from "#/lib/errors";
import { checkUnallocated } from "#/modules/bank-accounts/figures.server";
import {
  isRepaymentDateBeforeDebt,
  REPAYMENT_BEFORE_DEBT_MESSAGE,
} from "#/modules/repayments/utils";

type LinkedDebt = Pick<Debt, "id" | "name" | "direction" | "date">;

export type TransactionLink = { kind: "origination" | "repayment"; debt: LinkedDebt } | null;

export type TransactionLocks = { type: boolean; amount: boolean };

export type TransactionEdit = Pick<Transaction, "type" | "amount" | "date" | "note"> & {
  transactionId: Transaction["id"];
};

export type TransactionEditCheck =
  | { ok: true }
  | { ok: false; reason: "linked" | "unallocated"; message: string };

export const NEGATIVE_UNALLOCATED_MESSAGE =
  "This change would result in a negative unallocated balance. Adjust the amount or add more income first.";

export async function loadTransactionLink(
  db: DB,
  transactionId: Transaction["id"],
): Promise<TransactionLink> {
  const debtColumns = { id: true, name: true, direction: true, date: true } as const;

  const [repayment, fundedDebt] = await Promise.all([
    db.query.repayments.findFirst({
      columns: { id: true },
      where: { transactionId },
      with: { debt: { columns: debtColumns } },
    }),
    db.query.debts.findFirst({
      columns: debtColumns,
      where: { originatingTransactionId: transactionId },
    }),
  ]);

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
    return `This transaction is linked to ${link.debt.name}'s debt, so its type can't change.`;

  if (locks.amount && edit.amount !== current.amount)
    return `This transaction funded ${link.debt.name}'s debt, so its amount can't change. To correct it, delete the debt and record it again.`;

  if (link.kind === "repayment" && isRepaymentDateBeforeDebt(edit.date, link.debt.date))
    return REPAYMENT_BEFORE_DEBT_MESSAGE;

  return null;
}

export async function checkTransactionEdit(
  db: DB,
  userId: string,
  edit: TransactionEdit,
): Promise<TransactionEditCheck> {
  const [current, link] = await Promise.all([
    db.query.transactions.findFirst({
      columns: { type: true, amount: true },
      where: { id: edit.transactionId },
    }),
    loadTransactionLink(db, edit.transactionId),
  ]);

  if (!current) throw new NotFoundError("This transaction doesn't exist or may have been deleted.");

  const message = checkLinkRules(link, current, edit);
  if (message) return { ok: false, reason: "linked", message };

  const unallocated = await checkUnallocated(db, userId, {
    kind: "replace-transaction",
    transactionId: edit.transactionId,
    type: edit.type,
    amount: edit.amount,
  });

  if (!unallocated.ok)
    return { ok: false, reason: "unallocated", message: NEGATIVE_UNALLOCATED_MESSAGE };

  return { ok: true };
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
  if (link?.kind === "repayment")
    return `Its repayment on ${link.debt.name}'s debt will be removed too, so the outstanding goes back up.`;

  if (link?.kind === "origination")
    return `${link.debt.name}'s debt will stay, with no source account.`;

  return "";
}
