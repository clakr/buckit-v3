import { MutationCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AppError } from "#/lib/errors";

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

        await queryClient.invalidateQueries();
      },
      onError: (error, __, ___, mutation) => {
        toast.error(mutation.meta?.error.title ?? "Oops!", {
          description:
            error instanceof AppError
              ? error.message
              : (mutation.meta?.error.description ?? "Action did not proceed. Please try again."),
        });
      },
    }),
  });

  return {
    queryClient,
  };
}
export default function TanstackQueryProvider() {}
