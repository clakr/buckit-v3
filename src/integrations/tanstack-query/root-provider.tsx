import { MutationCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
    mutationCache: new MutationCache({
      onSuccess: async (_, __, ___, mutation) => {
        toast.success(mutation.meta?.success.title ?? "Nice!", {
          description: mutation.meta?.success.description ?? "Action proceeded successfully",
        });

        await queryClient.invalidateQueries();
      },
      onError: (_, __, ___, mutation) => {
        toast.error(mutation.meta?.error.title ?? "Oops!", {
          description:
            mutation.meta?.error.description ?? "Action did not proceed. Please try again.",
        });
      },
    }),
  });

  return {
    queryClient,
  };
}
export default function TanstackQueryProvider() {}
