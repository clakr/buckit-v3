import type { PropsWithChildren } from "react";

export function Template({ children }: PropsWithChildren) {
	return (
		<main className="grid place-items-center min-h-svh lg:grid-cols-2">
			{children}
			<section className="size-full hidden lg:block p-2">
				<img
					src="https://picsum.photos/2000"
					alt=""
					className="size-full object-center object-cover rounded-md"
				/>
			</section>
		</main>
	);
}
