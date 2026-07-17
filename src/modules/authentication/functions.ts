import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { auth } from "#/integrations/better-auth";
import { authMiddleware } from "#/lib/middlewares";
import { signUpUserSchema, signInUserSchema } from "#/modules/authentication/schema";

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

export const signOutUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async () => await auth.api.signOut({ headers: getRequestHeaders() }));

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
