import { MutationCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AppError, describeErrorForUser, UnauthorizedError } from "#/lib/errors";

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: {
      /** Not marked stale by a successful mutation; set on data no write can change. */
      keepOnWrite?: boolean;
    };
    mutationMeta: {
      success: {
        title: string;
        description: string;
      };
      error: {
        title: string;
        description: string;
      };
    };
  }
}

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Retrying can't change an expected failure (e.g. a record that's gone), only delay it.
        retry: (failureCount, error) => !(error instanceof AppError) && failureCount < 3,
      },
    },
    mutationCache: new MutationCache({
      onSuccess: async (_, __, ___, mutation) => {
        toast.success(mutation.meta?.success.title ?? "Nice!", {
          description: mutation.meta?.success.description ?? "Action proceeded successfully",
        });

        await queryClient.invalidateQueries({ predicate: (query) => !query.meta?.keepOnWrite });
      },
      onError: (error, __, ___, mutation) => {
        // Signed out by `sessionExpiryMiddleware`, which says so itself.
        if (error instanceof UnauthorizedError) return;

        toast.error(mutation.meta?.error.title ?? "Oops!", {
          description: describeErrorForUser(
            error,
            mutation.meta?.error.description ?? "Action did not proceed. Please try again.",
          ),
        });
      },
    }),
  });

  return {
    queryClient,
  };
}
export default function TanstackQueryProvider() {}
