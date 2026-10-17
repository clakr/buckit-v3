import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AppError, describeErrorForUser, UnauthorizedError } from "#/lib/errors";

declare module "@tanstack/react-query" {
  interface Register {
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

type Options = {
  /** Runs when a request finds the Session gone, e.g. expired or signed out in another tab. */
  onSessionExpired: (error: UnauthorizedError) => void;
};

export function getContext({ onSessionExpired }: Options) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Retrying can't change an expected failure (e.g. a record that's gone), only delay it.
        retry: (failureCount, error) => !(error instanceof AppError) && failureCount < 3,
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        if (error instanceof UnauthorizedError) onSessionExpired(error);
      },
    }),
    mutationCache: new MutationCache({
      onSuccess: async (_, __, ___, mutation) => {
        toast.success(mutation.meta?.success.title ?? "Nice!", {
          description: mutation.meta?.success.description ?? "Action proceeded successfully",
        });

        await queryClient.invalidateQueries();
      },
      onError: (error, __, ___, mutation) => {
        if (error instanceof UnauthorizedError) {
          onSessionExpired(error);

          return;
        }

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
