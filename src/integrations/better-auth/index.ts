import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { env } from "cloudflare:workers";

import { getDB } from "#/db";
import { users, sessions, accounts, verifications } from "#/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(getDB(env.db), {
    provider: "sqlite",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [tanstackStartCookies()],
});
