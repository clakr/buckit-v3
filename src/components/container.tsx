import { cn } from "@/lib/utils";

export function Container({
	children,
	className,
}: React.ComponentProps<"div">) {
	return (
		<div className={cn("p-6 flex flex-col gap-y-6", className)}>{children}</div>
	);
}
