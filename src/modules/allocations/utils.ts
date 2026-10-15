import type { BankAccount } from "#/db/schema";

import { currencyCodec } from "#/lib/codecs";
import { formatCurrency } from "#/lib/utils";

/**
 * Why an Allocation amount is too much, as the dialogs show it before submitting and the write
 * rejects it. `available` is in database amounts.
 */
export function describeInsufficientUnallocated({
  bankAccount,
  available,
}: {
  bankAccount: Pick<BankAccount, "name" | "currency">;
  available: number;
}) {
  return `Insufficient unallocated balance in ${bankAccount.name}. Available: ${formatCurrency(
    currencyCodec.encode(available),
    { currency: bankAccount.currency },
  )}`;
}
