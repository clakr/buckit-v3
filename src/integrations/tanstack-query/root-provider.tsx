import { MutationCache, QueryClient } from "@tanstack/react-query";

export function getContext() {
  const queryClient = new QueryClient({
    mutationCache: new MutationCache({
      onSuccess: () => {
        queryClient.invalidateQueries();
      },
      // onError(error) {
      //   toast.error("Oops!", {
      //     description: error.message,
      //   });
      // },
    }),
  });

  return {
    queryClient,
  };
}
export default function TanstackQueryProvider() {}
