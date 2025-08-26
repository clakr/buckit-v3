import { Container } from "@/components/container";
import { Heading } from "@/components/heading";
import { StateTemplate } from "@/components/states-template";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type {
	Bucket,
	Goal,
	Split,
	SplitAllocation,
} from "@/integrations/supabase/types";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import { splitQueryOption } from "@/modules/splits/query-options";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
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
	/** */
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

	/** */
	const queryClient = useQueryClient();
	const data = [
		...(queryClient.getQueryData<Bucket[]>(["buckets"]) ?? []),
		...(queryClient.getQueryData<Goal[]>(["goals"]) ?? []),
	];

	function getTargetName(targetId: SplitAllocation["target_id"]) {
		return data.find((item) => item.id === targetId)?.name ?? targetId;
	}

	return (
		<Container>
			<Heading heading={split.name} />

			<div className="grid gap-4 xl:grid-cols-5">
				<Card className="xl:col-span-3">
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
							{split.description ? (
								<>
									<DescriptionTerm>Description</DescriptionTerm>
									<DescriptionDefinition>
										{split.description}
									</DescriptionDefinition>
								</>
							) : null}
							<DescriptionTerm>Created</DescriptionTerm>
							<DescriptionDefinition className="text-sm font-medium">
								{formatDateTime(split.created_at)}
							</DescriptionDefinition>
							<DescriptionTerm>Last Updated</DescriptionTerm>
							<DescriptionDefinition className="text-sm font-medium">
								{formatDateTime(split.updated_at)}
							</DescriptionDefinition>
						</dl>
					</CardContent>
				</Card>

				<Card className="xl:col-span-2">
					<CardHeader>
						<CardTitle>Allocations</CardTitle>
						<CardDescription>
							How the base amount is distributed
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ul className="grid gap-4 grid-cols-[minmax(0,1fr)_auto]">
							{split.split_allocations.map((allocation) => (
								<li
									key={allocation.id}
									className="grid grid-cols-subgrid col-span-full"
								>
									<div className="flex flex-wrap gap-x-2 text-sm items-center">
										<b className="whitespace-nowrap text-ellipsis overflow-clip max-w-3/4">
											{getTargetName(allocation.target_id)}
										</b>
										<Badge className="capitalize">
											{allocation.target_type}
										</Badge>
										<span className="text-muted-foreground basis-full">
											{allocation.allocation_type === "fixed"
												? "Fixed Amount"
												: `Percentage (${allocation.percentage}%)`}
										</span>
									</div>
									<b className="text-lg">
										{transformAllocationAmount({
											amount: allocation.amount,
											allocation_type: allocation.allocation_type,
											percentage: allocation.percentage,
											base_amount: split.base_amount,
										})}
									</b>
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
