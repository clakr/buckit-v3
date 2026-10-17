import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { isAPIError } from "better-auth/api";

import { auth } from "#/integrations/better-auth";
import { AppError, ConflictError } from "#/lib/errors";
import { authMiddleware } from "#/lib/middlewares";
import { signUpUserSchema, signInUserSchema } from "#/modules/authentication/schemas";

export const signUpUser = createServerFn({
  method: "POST",
})
  .validator(signUpUserSchema)
  .handler(async ({ data }) => {
    try {
      return await auth.api.signUpEmail({
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
  });

export const getSession = createServerFn({
  method: "GET",
}).handler(async () => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });

  return session;
});

export const signOutUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(() => auth.api.signOut({ headers: getRequestHeaders() }));

export const signInUser = createServerFn({ method: "POST" })
  .validator(signInUserSchema)
  .handler(async ({ data }) => {
    try {
      return await auth.api.signInEmail({
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
  });
