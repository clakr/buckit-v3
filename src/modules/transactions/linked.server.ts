import { eq, inArray, type SQLWrapper } from "drizzle-orm";

import type { DB } from "#/db";

import { repayments, transactions, type Debt, type Transaction } from "#/db/schema";
import { checkUnallocated } from "#/modules/bank-accounts/figures.server";
import { isRepaymentDateBeforeDebt } from "#/modules/repayments/utils";

// A Linked Transaction is one a Debt depends on: a receivable's origination, or a repayment logged
// through a Bank Account. The Debt fixes parts of it, whichever page it's edited or deleted from.
// This is the one place those rules live.

type LinkedDebt = Pick<Debt, "id" | "name" | "direction" | "date">;

export type TransactionLink = { kind: "origination" | "repayment"; debt: LinkedDebt } | null;

/** What a Linked Transaction's Debt fixes in place. */
export type TransactionLocks = { type: boolean; amount: boolean };

/** An edit about to happen, in database amounts. */
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

  if (repayment?.debt) return { kind: "repayment", debt: repayment.debt };
  if (fundedDebt) return { kind: "origination", debt: fundedDebt };

  return null;
}

// A repayment's type follows its Debt's direction; an origination is the receivable's amount,
// which is never editable (delete the Debt and record it again).
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
    return "A repayment can't be dated before its debt was recorded.";

  return null;
}

/**
 * Whether an edit keeps the Transaction's Debt rules and Unallocated at or above zero. `userId`
 * scopes the Unallocated lookup to the user's own accounts.
 */
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

  // Callers sit behind an ownership check; a row gone since then has nothing left to break.
  if (current) {
    const message = checkLinkRules(link, current, edit);
    if (message) return { ok: false, reason: "linked", message };
  }

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

/** Writes an edit already checked with `checkTransactionEdit`. */
export function updateTransaction(db: DB, edit: TransactionEdit) {
  return db
    .update(transactions)
    .set({ type: edit.type, amount: edit.amount, date: edit.date, note: edit.note })
    .where(eq(transactions.id, edit.transactionId))
    .returning();
}

// The FK only nulls a repayment's `transactionId`, which would leave a blank, zero-amount row in
// the Debt's ledger. A repayment goes with its Transaction instead, so the Debt's outstanding goes
// back up. A Debt the Transaction funded survives with no source account (the FK's SET NULL).
export function isRepaymentBackedBy(transactionIds: SQLWrapper | Transaction["id"][]) {
  return inArray(repayments.transactionId, transactionIds);
}

export function deleteLinkedTransaction(db: DB, transactionId: Transaction["id"]) {
  return db.batch([
    db.delete(repayments).where(isRepaymentBackedBy([transactionId])),
    db.delete(transactions).where(eq(transactions.id, transactionId)).returning(),
  ]);
}

/** What deleting the Transaction does to its Debt, as a sentence for the confirmation. */
export function describeLinkedTransactionDeletion(link: TransactionLink) {
  if (link?.kind === "repayment")
    return `Its repayment on ${link.debt.name}'s debt will be removed too, so the outstanding goes back up.`;

  if (link?.kind === "origination")
    return `${link.debt.name}'s debt will stay, with no source account.`;

  return "";
}
