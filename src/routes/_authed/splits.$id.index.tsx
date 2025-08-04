import { Container } from "@/components/container";
import { Heading } from "@/components/heading";
import { StateTemplate } from "@/components/states-template";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { Split, SplitAllocation } from "@/integrations/supabase/types";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import { splitQueryOption } from "@/modules/splits/query-options";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	type ErrorComponentProps,
	createFileRoute,
} from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/splits/$id/")({
	loader: async ({ context: { queryClient }, params: { id } }) => {
		await queryClient.ensureQueryData(splitQueryOption(id));
	},
	pendingComponent: PendingComponent,
	errorComponent: ErrorComponent,
	component: RouteComponent,
});

function PendingComponent() {
	return (
		<Container>
			<Heading heading="Split" />
			<StateTemplate
				state="loading"
				heading="Loading split..."
				description="Please wait while we load your split"
			/>
		</Container>
	);
}

function ErrorComponent({ reset }: ErrorComponentProps) {
	return (
		<Container>
			<Heading heading="Split" />
			<StateTemplate
				state="error"
				heading="Failed to load split"
				description="We encountered an error while loading your split."
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
	 * fetching data
	 */
	const { id } = Route.useParams();
	const { data: split } = useSuspenseQuery(splitQueryOption(id));

	if (!split)
		return (
			<Container>
				<StateTemplate
					state="empty"
					heading="We can't find that split"
					description="If you think this is a mistake, please contact us"
				/>
			</Container>
		);

	return (
		<Container>
			<Heading heading={split.name} />

			<div className="grid gap-4 grid-cols-[minmax(0,1fr)_minmax(300px,500px)]">
				<Card className="">
					<CardHeader>
						<CardTitle>Split Overview</CardTitle>
						<CardDescription>
							Details about this financial split
						</CardDescription>
					</CardHeader>
					<CardContent>
						<dl>
							<DescriptionTerm>Base Amount</DescriptionTerm>
							<DescriptionDefinition className="text-2xl font-bold">
								{formatCurrency(split.base_amount)}
							</DescriptionDefinition>
							<DescriptionTerm>Description</DescriptionTerm>
							<DescriptionDefinition>{split.description}</DescriptionDefinition>
							<DescriptionTerm>Created At</DescriptionTerm>
							<DescriptionDefinition>
								{formatDateTime(split.created_at)}
							</DescriptionDefinition>
						</dl>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Allocations</CardTitle>
						<CardDescription>
							How the base amount is distributed
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ul className="grid gap-4">
							{split.split_allocations.map((allocation) => (
								<li
									key={allocation.id}
									className="grid grid-cols-subgrid col-span-2 row-span-2 gap-y-0 gap-x-2 "
								>
									<b className="font-semibold text-sm">
										{allocation.target_id}
									</b>
									<b className="row-span-2 text-end content-center text-lg">
										{transformAllocationAmount({
											amount: allocation.amount,
											allocation_type: allocation.allocation_type,
											percentage: allocation.percentage,
											base_amount: split.base_amount,
										})}
									</b>
									<span className="text-muted-foreground text-sm capitalize">
										{allocation.allocation_type === "fixed"
											? "Fixed Amount"
											: `Percentage (${allocation.percentage}%)`}
									</span>
								</li>
							))}
						</ul>
					</CardContent>
				</Card>
			</div>
		</Container>
	);
}

function DescriptionTerm({
	children,
	className,
	...props
}: React.ComponentProps<"dt">) {
	return (
		<dt {...props} className={cn("text-muted-foreground text-sm", className)}>
			{children}
		</dt>
	);
}

function DescriptionDefinition({
	children,
	className,
	...props
}: React.ComponentProps<"dd">) {
	return (
		<dd {...props} className={cn("mb-4", className)}>
			{children}
		</dd>
	);
}

function transformAllocationAmount({
	amount,
	allocation_type,
	percentage,
	base_amount,
}: Pick<SplitAllocation, "amount" | "allocation_type" | "percentage"> &
	Pick<Split, "base_amount">) {
	if (allocation_type === "percentage" && percentage) {
		amount = base_amount * (percentage / 100);
	}

	return formatCurrency(amount);
}
