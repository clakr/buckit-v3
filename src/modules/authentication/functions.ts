import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { auth } from "#/integrations/better-auth";
import {
  signUpUserSchema,
  signInUserSchema,
} from "#/modules/authentication/schema";

export const signUpUser = createServerFn({
  method: "POST",
})
  .validator(signUpUserSchema)
  .handler(({ data }) =>
    auth.api.signUpEmail({
      body: {
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        password: data.password,
      },
    }),
  );

export const getSession = createServerFn({
  method: "GET",
}).handler(async () => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });

  return session;
});

export const ensureSession = createServerFn({
  method: "GET",
}).handler(async () => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session) throw new Error("Unauthorized");

  return session;
});

export const signOutUser = createServerFn({ method: "POST" }).handler(
  async () => {
    const headers = getRequestHeaders();

    await auth.api.signOut({ headers });
  },
);

export const signInUser = createServerFn({ method: "POST" })
  .validator(signInUserSchema)
  .handler(({ data }) =>
    auth.api.signInEmail({
      body: {
        email: data.email,
        password: data.password,
      },
    }),
  );
