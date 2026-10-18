import type { z } from "zod";

import { getRequestHeaders } from "@tanstack/react-start/server";
import { isAPIError } from "better-auth/api";

import type { signInUserSchema, signUpUserSchema } from "#/modules/authentication/schemas";

import { auth } from "#/integrations/better-auth";
import { AppError, ConflictError, UnauthorizedError } from "#/lib/errors";

/*
 * The current request's Session, as Better-Auth keeps it. Every Better-Auth call outside its HTTP
 * route goes through here, so its shapes and error codes stop at this module. Nothing returned
 * carries the session token, which the httpOnly cookie keeps out of the browser.
 */

/** The signed-in User, or `null` without a Session. Only what the app shows. */
export async function readSession() {
  const session = await auth.api.getSession({ headers: getRequestHeaders() });

  if (!session) return null;

  const { id, name, email } = session.user;

  return { id, name, email };
}

/** The signed-in User's id. Without a Session, throws `UnauthorizedError`, which signs the client out. */
export async function requireUserId() {
  const user = await readSession();

  if (!user) throw new UnauthorizedError("Your session has expired. Please log in again.");

  return user.id;
}

export async function signInWithEmail(data: z.infer<typeof signInUserSchema>) {
  try {
    await auth.api.signInEmail({
      body: {
        email: data.email,
        password: data.password,
      },
    });
  } catch (error) {
    // Not `UnauthorizedError`: that means a Session ran out, and the client signs out on it.
    if (isAPIError(error) && error.body?.code === "INVALID_EMAIL_OR_PASSWORD") {
      throw new AppError("Incorrect email or password.");
    }

    throw error;
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
