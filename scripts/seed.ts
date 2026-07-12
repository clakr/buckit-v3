import { drizzle } from "drizzle-orm/libsql";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { bankAccounts } from "../src/db/schema";

const DB_DIR = join(
  process.cwd(),
  ".wrangler",
  "state",
  "v3",
  "d1",
  "miniflare-D1DatabaseObject",
);

const files = readdirSync(DB_DIR)
  .filter((f) => f.endsWith(".sqlite") && f !== "metadata.sqlite")
  .map((f) => ({
    name: f,
    path: join(DB_DIR, f),
    mtime: statSync(join(DB_DIR, f)).mtimeMs,
  }))
  .sort((a, b) => b.mtime - a.mtime);

if (files.length === 0) {
  console.error(
    "No D1 SQLite database found. Run the app first (pnpm dev) to create it.",
  );
  process.exit(1);
}

const dbPath = files[0].path;
console.log(`Using database: ${dbPath}`);

const db = drizzle(`file:${dbPath}`);

const userId = "KU2UfncHfs4hn5SsrVvvEy0ja7Ud9R5J";

const accounts = [
  {
    id: crypto.randomUUID(),
    userId,
    name: "Everyday Checking",
    currency: "PHP" as const,
    startingBalance: 1_250_075,
  },
  {
    id: crypto.randomUUID(),
    userId,
    name: "Travel Fund",
    currency: "QAR" as const,
    startingBalance: 500_000,
  },
  {
    id: crypto.randomUUID(),
    userId,
    name: "Emergency Fund",
    currency: "USD" as const,
    startingBalance: 1_500_000,
  },
  {
    id: crypto.randomUUID(),
    userId,
    name: "Main Savings",
    currency: "USD" as const,
    startingBalance: 4_500_050,
  },
  {
    id: crypto.randomUUID(),
    userId,
    name: "Business Account",
    currency: "QAR" as const,
    startingBalance: 1_000_025,
  },
  {
    id: crypto.randomUUID(),
    userId,
    name: "Remittance Account",
    currency: "PHP" as const,
    startingBalance: 7_500_000,
  },
];

console.log(`Seeding ${accounts.length} bank accounts...`);

for (const account of accounts) {
  await db.insert(bankAccounts).values(account);
  console.log(`  ✓ ${account.name} (${account.currency})`);
}

console.log("Done!");
