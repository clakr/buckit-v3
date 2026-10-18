import type { RegisteredRouter } from "@tanstack/react-router";
import type { z } from "zod";

import { toast } from "sonner";

import type { signInUserSchema, signUpUserSchema } from "#/modules/authentication/schemas";

import { Button } from "#/components/ui/button";
import { describeErrorForUser, UnauthorizedError } from "#/lib/errors";
import { signInUser, signOutUser, signUpUser } from "#/modules/authentication/functions";
import { sessionQueryOption } from "#/modules/authentication/query-options";

/*
 * Entering and leaving a Session on the client. Query results are User-scoped, so the cache is
 * emptied whenever a Session starts or ends, and nothing the previous User loaded survives into
 * the next one.
 */

let isLeaving = false;

/** Signs in and lands on the dashboard. A failure is toasted, not thrown. */
export async function signIn(router: RegisteredRouter, data: z.infer<typeof signInUserSchema>) {
  try {
    await signInUser({ data });
  } catch (error) {
    console.error(error);

    toast.error("Failed to Sign In", {
      description: describeErrorForUser(error, "We weren't able to sign you in. Please try again."),
    });

    return;
  }

  await enterSession(router);
}

/** Creates the account, signed in, and lands on the dashboard. A failure is toasted, not thrown. */
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

/**
 * Signs out and returns to the login page. Ignored while already leaving. A Session that's
 * already gone (expired, or signed out in another tab) counts as signed out.
 */
export async function signOut(router: RegisteredRouter) {
  if (isLeaving) return;
  isLeaving = true;

  try {
    await signOutUser();
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) {
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

/**
 * A request found the Session gone. Several queries can fail at once; only the first one leaves.
 * Does nothing on the server.
 */
export async function leaveExpiredSession(router: RegisteredRouter, error: UnauthorizedError) {
  if (router.isServer || isLeaving) return;
  isLeaving = true;

  toast.error("Signed Out", { description: error.message });

  await leaveSession(router);
}

async function enterSession(router: RegisteredRouter) {
  router.options.context.queryClient.clear();

  await router.navigate({ to: "/dashboard", replace: true });
}

async function leaveSession(router: RegisteredRouter) {
  // Signed out before navigating, or the login page's guard would send the cached User back in.
  router.options.context.queryClient.setQueryData(sessionQueryOption().queryKey, null);

  try {
    await router.navigate({ to: "/", replace: true });
  } finally {
    // After leaving, so the protected pages' queries don't refetch into the same failure.
    router.options.context.queryClient.clear();
    isLeaving = false;
  }
}
