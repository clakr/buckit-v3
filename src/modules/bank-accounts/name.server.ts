import { bankAccounts } from "#/db/schema";
import { createUniqueNameRule } from "#/lib/unique-name.server";

export const bankAccountNameRule = createUniqueNameRule({
  table: bankAccounts,
  indexName: "bank_accounts_user_id_lower_name_unique",
  takenMessage: "An account with this name already exists.",
});
