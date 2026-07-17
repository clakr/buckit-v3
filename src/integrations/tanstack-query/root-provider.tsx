import { MutationCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      "success-message"?: string;
      "error-message"?: string;
    };
  }
}

export function getContext() {
  const queryClient = new QueryClient({
    mutationCache: new MutationCache({
      onSuccess: async (_, __, ___, mutation) => {
        toast.success("Nice!", {
          description: mutation.meta?.["success-message"] ?? "Action proceeded succesfully",
        });

        await queryClient.invalidateQueries();
      },
      onError: (_, __, ___, mutation) => {
        toast.error("Oops!", {
          description:
            mutation.meta?.["error-message"] ?? "Action did not proceed. Please try again.",
        });
      },
    }),
  });

  return {
    queryClient,
  };
}
export default function TanstackQueryProvider() {}
