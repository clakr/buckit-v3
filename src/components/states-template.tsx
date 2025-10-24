import { cn } from "@/lib/utils";
import { Icon } from "@iconify/react";

type Props = React.PropsWithChildren<{
	state: "loading" | "error";
	heading: string;
	description: string;
}>;

export function StateTemplate({
	state,
	children,
	heading,
	description,
}: Props) {
	const statesIconMapping: Record<typeof state, string> = {
		loading: "bx:loader-alt",
		error: "bxs:info-circle",
	};

	return (
		<section className="grid place-content-center text-center min-h-[25svh] gap-y-4">
			<div className="bg-muted size-12 justify-self-center p-2.5 rounded-full">
				<Icon
					icon={statesIconMapping[state]}
					className={cn("size-full", state === "loading" && "animate-spin")}
				/>
			</div>
			<div className="leading-none">
				<h3 className="text-lg font-bold">{heading}</h3>
				<p className="text-sm text-muted-foreground">{description}</p>
			</div>
			{children}
		</section>
	);
}
