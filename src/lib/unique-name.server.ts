import type { AnySQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";

import { and, eq, getTableName, ne, sql } from "drizzle-orm";

import type { DB } from "#/db";

import { lower } from "#/db/schema";
import { ConflictError } from "#/lib/errors";

type NamedTable = SQLiteTable & {
  id: AnySQLiteColumn;
  userId: AnySQLiteColumn;
  name: AnySQLiteColumn;
};

export function createUniqueNameRule({
  table,
  indexName,
  takenMessage,
}: {
  table: NamedTable;
  indexName: string;
  takenMessage: string;
}) {
  function isNameTakenError(error: unknown) {
    for (let cause = error; cause instanceof Error; cause = cause.cause) {
      if (
        cause.message.includes("UNIQUE constraint failed") &&
        (cause.message.includes(indexName) || cause.message.includes(`${getTableName(table)}.name`))
      )
        return true;
    }

    return false;
  }

  return {
    async check(db: DB, userId: string, { name, excludeId }: { name: string; excludeId?: string }) {
      const [taken] = await db
        .select({ id: table.id })
        .from(table)
        .where(
          and(
            eq(table.userId, userId),
            eq(lower(table.name), sql`lower(${name})`),
            excludeId ? ne(table.id, excludeId) : undefined,
          ),
        )
        .limit(1);

      return taken ? { isValid: false, message: takenMessage } : { isValid: true, message: "ok" };
    },

    async write<Result>(query: Promise<Result>) {
      try {
        return await query;
      } catch (error) {
        if (isNameTakenError(error)) throw new ConflictError(takenMessage);

        throw error;
      }
    },
  };
}
