import type { RegisteredRouter } from "@tanstack/react-router";
import type { z } from "zod";

import { toast } from "sonner";

import type { signInUserSchema, signUpUserSchema } from "#/modules/authentication/schemas";

import { Button } from "#/components/ui/button";
import { describeErrorForUser, SessionExpiredError } from "#/lib/errors";
import { signInUser, signOutUser, signUpUser } from "#/modules/authentication/functions";
import { sessionQueryOption } from "#/modules/authentication/query-options";

let isLeaving = false;

export async function signIn(
  router: RegisteredRouter,
  data: z.infer<typeof signInUserSchema>,
  redirectTo?: string,
) {
  try {
    await signInUser({ data });
  } catch (error) {
    console.error(error);

    toast.error("Failed to Sign In", {
      description: describeErrorForUser(error, "We weren't able to sign you in. Please try again."),
    });

    return;
  }

  await enterSession(router, redirectTo);
}

export async function signUp(router: RegisteredRouter, data: z.infer<typeof signUpUserSchema>) {
  try {
    await signUpUser({ data });
  } catch (error) {
    console.error(error);

    toast.error("Failed to Create Account", {
      description: describeErrorForUser(
        error,
        "We weren't able to create your account. Please try again.",
      ),
    });

    return;
  }

  await enterSession(router);
}

export async function signOut(router: RegisteredRouter) {
  if (isLeaving) return;
  isLeaving = true;

  try {
    await signOutUser();
  } catch (error) {
    if (!(error instanceof SessionExpiredError)) {
      console.error(error);

      isLeaving = false;

      toast.error("Failed to Sign Out", {
        description: describeErrorForUser(
          error,
          "We weren't able to sign you out. Please try again.",
        ),
        action:
          error instanceof TypeError ? (
            <Button onClick={() => signOut(router)}>Retry</Button>
          ) : undefined,
      });

      return;
    }
  }

  await leaveSession(router);
}

export async function leaveExpiredSession(router: RegisteredRouter, error: SessionExpiredError) {
  if (router.isServer || isLeaving) return;
  isLeaving = true;

  toast.error("Signed Out", { description: error.message });

  await leaveSession(router, router.state.location.href);
}

async function enterSession(router: RegisteredRouter, redirectTo?: string) {
  router.options.context.queryClient.clear();

  await (redirectTo
    ? router.navigate({ href: redirectTo, replace: true })
    : router.navigate({ to: "/dashboard", replace: true }));
}

async function leaveSession(router: RegisteredRouter, redirectTo?: string) {
  router.options.context.queryClient.setQueryData(sessionQueryOption().queryKey, null);

  try {
    await router.navigate({ to: "/", search: { redirect: redirectTo }, replace: true });
  } finally {
    router.options.context.queryClient.clear();
    isLeaving = false;
  }
}
