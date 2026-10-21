import { buckets } from "#/db/schema";
import { createUniqueNameRule } from "#/lib/unique-name.server";

export const bucketNameRule = createUniqueNameRule({
  table: buckets,
  indexName: "buckets_user_id_lower_name_unique",
  takenMessage: "A bucket with this name already exists.",
});
