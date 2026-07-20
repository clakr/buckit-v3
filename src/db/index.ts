import { drizzle, type AnyD1Database } from "drizzle-orm/d1";

import { relations } from "#/db/schema";

export function getDB(db: AnyD1Database) {
  return drizzle(db, { relations });
}
