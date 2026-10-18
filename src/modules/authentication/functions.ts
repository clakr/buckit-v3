import { createServerFn } from "@tanstack/react-start";

import { authMiddleware } from "#/modules/authentication/middlewares";
import { signUpUserSchema, signInUserSchema } from "#/modules/authentication/schemas";
import {
  readSession,
  signInWithEmail,
  signOutSession,
  signUpWithEmail,
} from "#/modules/authentication/session.server";

export const signUpUser = createServerFn({
  method: "POST",
})
  .validator(signUpUserSchema)
  .handler(({ data }) => signUpWithEmail(data));

/** The signed-in User (`id`, `name`, `email`), or `null`. */
export const getSession = createServerFn({
  method: "GET",
}).handler(() => readSession());

export const signOutUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(() => signOutSession());

export const signInUser = createServerFn({ method: "POST" })
  .validator(signInUserSchema)
  .handler(({ data }) => signInWithEmail(data));
