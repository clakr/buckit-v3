import { Container } from "@/components/container";
import { Heading } from "@/components/heading";
import { StateTemplate } from "@/components/states-template";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { SplitDropdownMenu } from "@/modules/splits/components/split-dropdown-menu";
import { splitsQueryOption } from "@/modules/splits/query-options";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	type ErrorComponentProps,
	Link,
	createFileRoute,
} from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/splits/")({
	loader: async ({ context: { queryClient } }) => {
		await queryClient.ensureQueryData(splitsQueryOption);
	},
	pendingComponent: PendingComponent,
	errorComponent: ErrorComponent,
	component: RouteComponent,
});

function PendingComponent() {
	return (
		<Container>
			<Heading heading="Splits" />
			<StateTemplate
				state="loading"
				heading="Loading splits..."
				description="Please wait while we load your splits"
			/>
		</Container>
	);
}

function ErrorComponent({ reset }: ErrorComponentProps) {
	return (
		<Container>
			<Heading heading="Splits" />
			<StateTemplate
				state="error"
				heading="Failed to load splits"
				description="We encountered an error while loading your splits."
			>
				<div>
					<Button onClick={reset}>Try Again</Button>
				</div>
			</StateTemplate>
		</Container>
	);
}

function RouteComponent() {
	/**
	 * data fetching
	 */
	const { data: splits } = useSuspenseQuery(splitsQueryOption);

	if (splits.length === 0) {
		return (
			<Container>
				<Heading heading="Splits">
					<Button asChild>
						<Link to="/splits/create">
							<Icon icon="bx:plus" />
							Create Split
						</Link>
					</Button>
				</Heading>
				<StateTemplate
					state="empty"
					heading="No splits yet"
					description="Get started by creating your first split"
				>
					<div>
						<Button variant="secondary" asChild>
							<Link to="/splits/create">
								<Icon icon="bx:plus" />
								Create Split
							</Link>
						</Button>
					</div>
				</StateTemplate>
			</Container>
		);
	}

	return (
		<Container>
			<Heading heading="Split">
				<Button asChild>
					<Link to="/splits/create">
						<Icon icon="bx:plus" />
						Create Split
					</Link>
				</Button>
			</Heading>
			<section className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
				{splits.map((split) => (
					<Card
						key={split.id}
						className="relative grid grid-rows-subgrid row-span-2"
					>
						<SplitDropdownMenu id={split.id} />
						<CardHeader className="gap-y-1">
							<CardTitle>{split.name}</CardTitle>
						</CardHeader>
						<CardFooter className="flex flex-col items-start">
							<b className="text-2xl">{formatCurrency(split.base_amount)}</b>
							<span className="text-sm text-muted-foreground">
								{split.description}
							</span>
						</CardFooter>
					</Card>
				))}
			</section>
		</Container>
	);
}
