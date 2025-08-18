import {
	MutationCache,
	QueryClient,
	QueryClientProvider,
	type QueryKey,
} from "@tanstack/react-query";
import { toast } from "sonner";

declare module "@tanstack/react-query" {
	interface Register {
		mutationMeta: {
			errorTitle: string;
			successMessage: string;
			invalidatesQuery: QueryKey;
		};
	}
}

const queryClient = new QueryClient({
	mutationCache: new MutationCache({
		onError(error, _, __, mutation) {
			if (mutation.meta?.errorTitle) {
				toast.error(mutation.meta.errorTitle, {
					description: error.message,
				});
			}
		},
		onSuccess(_, __, ___, mutation) {
			if (mutation.meta?.successMessage) {
				toast.success(mutation.meta.successMessage);
			}
		},
		onSettled(_, __, ___, ____, mutation) {
			if (mutation.meta?.invalidatesQuery) {
				queryClient.invalidateQueries({
					queryKey: mutation.meta.invalidatesQuery,
				});
			}
		},
	}),
});

export function getContext() {
	return {
		queryClient,
	};
}

export function Provider({ children }: { children: React.ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
