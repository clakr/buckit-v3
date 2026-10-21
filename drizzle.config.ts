import { defineConfig } from "drizzle-kit";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Wrangler/Miniflare keeps local D1 data here after `pnpm db:migrate:local`.
const LOCAL_D1_DIR = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";

function findLocalD1DatabaseFile() {
  if (!existsSync(LOCAL_D1_DIR)) return undefined;

  const databaseFile = readdirSync(LOCAL_D1_DIR).find(
    (fileName) => fileName.endsWith(".sqlite") && fileName !== "metadata.sqlite",
  );

  return databaseFile && join(LOCAL_D1_DIR, databaseFile);
}

const localD1DatabaseFile = findLocalD1DatabaseFile();

export default defineConfig({
  out: "./migrations",
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
  ...(localD1DatabaseFile && {
    dbCredentials: { url: `file:${localD1DatabaseFile}` },
  }),
});
