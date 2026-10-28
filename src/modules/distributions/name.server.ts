import { distributions } from "#/db/schema";
import { createUniqueNameRule } from "#/lib/unique-name.server";

export const distributionNameRule = createUniqueNameRule({
  table: distributions,
  indexName: "distributions_user_id_lower_name_unique",
  takenMessage: "A distribution with this name already exists.",
});
