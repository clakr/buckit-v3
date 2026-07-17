import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { isAPIError } from "better-auth/api";
import { Result } from "better-result";

import { auth } from "#/integrations/better-auth";
import { authMiddleware } from "#/lib/middlewares";
import {
  signUpUserSchema,
  signInUserSchema,
} from "#/modules/authentication/schema";

// @todo: use native Error instead
export const signUpUser = createServerFn({
  method: "POST",
})
  .validator(signUpUserSchema)
  .handler(async ({ data }) => {
    const result = await Result.tryPromise({
      try: () =>
        auth.api.signUpEmail({
          body: {
            name: `${data.firstName} ${data.lastName}`,
            email: data.email,
            password: data.password,
          },
        }),
      catch: (e) => e,
    });

    if (result.status === "error") {
      if (isAPIError(result.error)) {
        return Result.serialize(
          Result.err(result.error.body?.message ?? result.error.message),
        );
      }

      return Result.serialize(
        Result.err(
          result.error instanceof Error
            ? result.error.message
            : String(result.error),
        ),
      );
    }

    return Result.serialize(Result.ok());
  });

export const getSession = createServerFn({
  method: "GET",
}).handler(async () => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });

  return session;
});

// @todo: use native Error instead
export const signOutUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async () => {
    const headers = getRequestHeaders();

    const result = await Result.tryPromise({
      try: () => auth.api.signOut({ headers }),
      catch: (e) => e,
    });

    if (result.status === "error") {
      if (isAPIError(result.error)) {
        return Result.serialize(
          Result.err(result.error.body?.message ?? result.error.message),
        );
      }

      return Result.serialize(
        Result.err(
          result.error instanceof Error
            ? result.error.message
            : String(result.error),
        ),
      );
    }

    return Result.serialize(Result.ok());
  });

// @todo: use native Error instead
export const signInUser = createServerFn({ method: "POST" })
  .validator(signInUserSchema)
  .handler(async ({ data }) => {
    const result = await Result.tryPromise({
      try: () =>
        auth.api.signInEmail({
          body: {
            email: data.email,
            password: data.password,
          },
        }),
      catch: (e) => e,
    });

    if (result.status === "error") {
      if (isAPIError(result.error)) {
        return Result.serialize(
          Result.err(result.error.body?.message ?? result.error.message),
        );
      }

      return Result.serialize(
        Result.err(
          result.error instanceof Error
            ? result.error.message
            : String(result.error),
        ),
      );
    }

    return Result.serialize(Result.ok());
  });
