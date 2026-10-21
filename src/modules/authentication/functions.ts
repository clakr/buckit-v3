import { createServerFn } from "@tanstack/react-start";

import { authMiddleware, privateResponseMiddleware } from "#/modules/authentication/middlewares";
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
  .middleware([privateResponseMiddleware])
  .validator(signUpUserSchema)
  .handler(({ data }) => signUpWithEmail(data));

export const getSession = createServerFn({
  method: "GET",
})
  .middleware([privateResponseMiddleware])
  .handler(() => readSession());

export const signOutUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(() => signOutSession());

export const signInUser = createServerFn({ method: "POST" })
  .middleware([privateResponseMiddleware])
  .validator(signInUserSchema)
  .handler(({ data }) => signInWithEmail(data));
