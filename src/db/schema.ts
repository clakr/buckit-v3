import { defineRelations, SQL, sql } from "drizzle-orm";
import {
  check,
  sqliteTable,
  text,
  integer,
  index,
  unique,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

import { CURRENCIES_CODES } from "#/lib/constants";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verifications = sqliteTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const bankAccounts = sqliteTable(
  "bank_accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    currency: text("currency", { enum: CURRENCIES_CODES }).notNull(),
    startingBalance: integer("starting_balance").default(0).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (t) => [
    unique().on(t.userId, t.name),
    // The name rule is case-insensitive. Added beside the constraint above rather than replacing
    // it: dropping a table-level constraint needs a table rebuild, and D1's foreign keys would
    // cascade-delete every Transaction and Allocation when the old table is dropped.
    uniqueIndex("bank_accounts_user_id_lower_name_unique").on(t.userId, lower(t.name)),
  ],
);

export const buckets = sqliteTable(
  "buckets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (t) => [
    unique().on(t.userId, t.name),
    // Same reasoning as `bank_accounts`: dropping `buckets` would cascade-delete its Allocations.
    uniqueIndex("buckets_user_id_lower_name_unique").on(t.userId, lower(t.name)),
  ],
);

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  bankAccountId: text("bank_account_id")
    .notNull()
    .references(() => bankAccounts.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  amount: integer("amount").notNull(),
  note: text("note"),
  date: integer("date", { mode: "timestamp" })
    .default(sql`(cast(unixepoch() as integer))`)
    .notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

export const allocations = sqliteTable("allocations", {
  id: text("id").primaryKey(),
  bankAccountId: text("bank_account_id")
    .notNull()
    .references(() => bankAccounts.id, { onDelete: "cascade" }),
  bucketId: text("bucket_id")
    .notNull()
    .references(() => buckets.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  note: text("note"),
  date: integer("date", { mode: "timestamp" })
    .default(sql`(cast(unixepoch() as integer))`)
    .notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

export const debts = sqliteTable("debts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "set null" }),
  direction: text("direction", { enum: ["receivable", "payable"] }).notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency", { enum: CURRENCIES_CODES }).notNull(),
  name: text("name").notNull(),
  originatingTransactionId: text("originating_transaction_id").references(
    (): AnySQLiteColumn => transactions.id,
    { onDelete: "set null" },
  ),
  date: integer("date", { mode: "timestamp" })
    .default(sql`(cast(unixepoch() as integer))`)
    .notNull(),
  note: text("note"),
  forgivenAt: integer("forgiven_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

export const repayments = sqliteTable(
  "repayments",
  {
    id: text("id").primaryKey(),
    debtId: text("debt_id")
      .notNull()
      .references(() => debts.id, { onDelete: "cascade" }),
    amount: integer("amount"),
    date: integer("date", { mode: "timestamp" }),
    note: text("note"),
    transactionId: text("transaction_id")
      .unique()
      .references(() => transactions.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (t) => [
    check(
      "repayments_one_storage_form",
      sql`(${t.transactionId} IS NOT NULL AND ${t.amount} IS NULL AND ${t.date} IS NULL AND ${t.note} IS NULL) OR (${t.transactionId} IS NULL AND ${t.amount} IS NOT NULL AND ${t.date} IS NOT NULL)`,
    ),
  ],
);

export const withdrawals = sqliteTable("withdrawals", {
  id: text("id").primaryKey(),
  bucketId: text("bucket_id")
    .notNull()
    .references(() => buckets.id, { onDelete: "cascade" }),
  transactionId: text("transaction_id")
    .notNull()
    .unique()
    .references(() => transactions.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

export const relations = defineRelations(
  {
    users,
    sessions,
    accounts,
    verifications,
    bankAccounts,
    buckets,
    transactions,
    allocations,
    debts,
    repayments,
    withdrawals,
  },
  (r) => ({
    users: {
      sessions: r.many.sessions(),
      accounts: r.many.accounts(),
    },
    sessions: {
      user: r.one.users({
        from: r.sessions.userId,
        to: r.users.id,
      }),
    },
    accounts: {
      user: r.one.users({
        from: r.accounts.userId,
        to: r.users.id,
      }),
    },
    bankAccounts: {
      user: r.one.users({
        from: r.bankAccounts.userId,
        to: r.users.id,
      }),
      transactions: r.many.transactions(),
      allocations: r.many.allocations(),
    },
    buckets: {
      user: r.one.users({
        from: r.buckets.userId,
        to: r.users.id,
      }),
      allocations: r.many.allocations(),
      withdrawals: r.many.withdrawals(),
    },
    transactions: {
      bankAccount: r.one.bankAccounts({
        from: r.transactions.bankAccountId,
        to: r.bankAccounts.id,
      }),
      withdrawal: r.one.withdrawals({
        from: r.transactions.id,
        to: r.withdrawals.transactionId,
      }),
    },
    allocations: {
      bankAccount: r.one.bankAccounts({
        from: r.allocations.bankAccountId,
        to: r.bankAccounts.id,
      }),
      bucket: r.one.buckets({
        from: r.allocations.bucketId,
        to: r.buckets.id,
      }),
    },
    debts: {
      user: r.one.users({
        from: r.debts.userId,
        to: r.users.id,
      }),
      originatingTransaction: r.one.transactions({
        from: r.debts.originatingTransactionId,
        to: r.transactions.id,
      }),
      repayments: r.many.repayments(),
    },
    withdrawals: {
      bucket: r.one.buckets({
        from: r.withdrawals.bucketId,
        to: r.buckets.id,
        optional: false,
      }),
      transaction: r.one.transactions({
        from: r.withdrawals.transactionId,
        to: r.transactions.id,
        optional: false,
      }),
    },
    repayments: {
      debt: r.one.debts({
        from: r.repayments.debtId,
        to: r.debts.id,
        optional: false,
      }),
      transaction: r.one.transactions({
        from: r.repayments.transactionId,
        to: r.transactions.id,
      }),
    },
  }),
);

export type BankAccount = typeof bankAccounts.$inferSelect;
export type Bucket = typeof buckets.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Allocation = typeof allocations.$inferSelect;
export type Debt = typeof debts.$inferSelect;
export type Repayment = typeof repayments.$inferSelect;
export type Withdrawal = typeof withdrawals.$inferSelect;

export function lower(email: AnySQLiteColumn): SQL {
  return sql`lower(${email})`;
}
