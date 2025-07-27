import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Link } from "@tanstack/react-router";

type Props = React.PropsWithChildren<{
	heading: string;
	description?: string | null;
}>;

export function Heading({ heading, description, children }: Props) {
	return (
		<div className="flex gap-x-4 items-center">
			<Button asChild variant="ghost" size="icon">
				<Link to="..">
					<Icon icon="bx:left-arrow-alt" className="size-6" />
				</Link>
			</Button>
			<div className="grow">
				<h1 className="text-2xl font-bold capitalize">{heading}</h1>
				{description ? (
					<span className="text-muted-foreground text-sm">{description}</span>
				) : null}
			</div>
			{children}
		</div>
	);
}
