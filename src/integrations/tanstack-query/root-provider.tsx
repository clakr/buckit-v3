import { MutationCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      success: {
        title: string;
        description: string;
        toReplace: Array<string>;
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
      onSuccess: async (_, variables, __, mutation) => {
        let description = "Action proceeded successfully";

        if (mutation.meta?.success.toReplace) {
          description = mutation.meta.success.description;

          for (const key of mutation.meta.success.toReplace) {
            description = description.replaceAll(`[${key}]`, variables.data[key]);
          }
        }

        toast.success(mutation.meta?.success.title ?? "Nice!", {
          description,
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
