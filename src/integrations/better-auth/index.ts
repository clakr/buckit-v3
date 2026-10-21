import "@tanstack/react-start/server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { env } from "cloudflare:workers";

import { getDB } from "#/db";
import { users, sessions, accounts, verifications } from "#/db/schema";

const PATHS_ONLY_VIA_THROTTLED_SERVER_FUNCTIONS = ["/sign-in/email", "/sign-up/email"];

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
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
  disabledPaths: PATHS_ONLY_VIA_THROTTLED_SERVER_FUNCTIONS,
  advanced: {
    ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
  },
  plugins: [tanstackStartCookies()],
});
