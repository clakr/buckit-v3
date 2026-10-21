import type { z } from "zod";

import { getRequestHeader, getRequestHeaders } from "@tanstack/react-start/server";
import { isAPIError } from "better-auth/api";
import { env } from "cloudflare:workers";

import type { signInUserSchema, signUpUserSchema } from "#/modules/authentication/schemas";

import { auth } from "#/integrations/better-auth";
import { AppError, ConflictError, RateLimitedError, SessionExpiredError } from "#/lib/errors";

export async function readSession() {
  const session = await auth.api.getSession({ headers: getRequestHeaders() });

  if (!session) return null;

  const { id, name, email } = session.user;

  return { id, name, email };
}

export async function requireUserId() {
  const user = await readSession();

  if (!user) throw new SessionExpiredError("Your session has expired. Please log in again.");

  return user.id;
}

export async function consumeAuthAttempt(action: "sign-in" | "sign-up") {
  const clientIp = getRequestHeader("cf-connecting-ip") ?? "unknown";
  const { success } = await env.AUTH_ATTEMPT_LIMITER.limit({ key: `${action}:${clientIp}` });

  if (!success) {
    throw new RateLimitedError("Too many attempts. Please wait a minute and try again.");
  }
}

export async function signInWithEmail(data: z.infer<typeof signInUserSchema>) {
  const headers = getRequestHeaders();
  const staleSession = await auth.api.getSession({ headers, query: { disableRefresh: true } });

  try {
    await auth.api.signInEmail({
      body: {
        email: data.email,
        password: data.password,
      },
      headers,
    });
  } catch (error) {
    if (isAPIError(error) && error.body?.code === "INVALID_EMAIL_OR_PASSWORD") {
      throw new AppError("Incorrect email or password.");
    }

    throw error;
  }

  // Only after the new Session exists, so a wrong password doesn't end a working one.
  if (staleSession) {
    await auth.api.revokeSession({ body: { token: staleSession.session.token }, headers });
  }
}

export async function signUpWithEmail(data: z.infer<typeof signUpUserSchema>) {
  try {
    await auth.api.signUpEmail({
      body: {
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        password: data.password,
      },
      headers: getRequestHeaders(),
    });
  } catch (error) {
    if (isAPIError(error) && error.body?.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
      throw new ConflictError("An account with this email already exists. Try signing in.");
    }

    throw error;
  }
}

export async function signOutSession() {
  await auth.api.signOut({ headers: getRequestHeaders() });
}
