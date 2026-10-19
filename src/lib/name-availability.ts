import type { z } from "zod";

import { AppError, UnauthorizedError } from "#/lib/errors";

type NameCheck = (name: string) => Promise<{ isValid: boolean; message: string }>;

/**
 * A name field's async refinement: asks the server whether `name` is free. A taken name shows the
 * server's message; a failed check shows a retry message rather than the raw transport error,
 * unless it's an `AppError`, whose message is safe to show.
 */
export function refineNameAvailability(checkName: NameCheck) {
  return async function (name: string, context: z.RefinementCtx<string>) {
    if (!name) return;

    try {
      const { isValid, message } = await checkName(name);

      if (!isValid) context.addIssue({ code: "custom", message });
    } catch (error) {
      // The Session ran out: the client is already signing out and says so.
      if (error instanceof UnauthorizedError) return;

      console.error(error);

      context.addIssue({
        code: "custom",
        message:
          error instanceof AppError ? error.message : "Couldn't check this name. Please try again.",
      });
    }
  };
}
