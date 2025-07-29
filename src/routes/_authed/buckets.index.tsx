import { Container } from "@/components/container";
import { Heading } from "@/components/heading";
import { StateTemplate } from "@/components/states-template";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { BucketDropdownMenu } from "@/modules/buckets/components/bucket-dropdown-menu";
import {
	CreateBucketDialog,
	useCreateBucketDialogStore,
} from "@/modules/buckets/components/create-bucket-dialog";
import { CreateTransactionDialog } from "@/modules/buckets/components/create-transaction-dialog";
import { EditBucketDialog } from "@/modules/buckets/components/edit-bucket-dialog";
import { bucketsQueryOption } from "@/modules/buckets/query-options";
import { Icon } from "@iconify/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	type ErrorComponentProps,
	createFileRoute,
} from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/buckets/")({
	loader: async ({ context: { queryClient } }) => {
		await queryClient.ensureQueryData(bucketsQueryOption);
	},
	pendingComponent: PendingComponent,
	errorComponent: ErrorComponent,
	component: RouteComponent,
});

function PendingComponent() {
	return (
		<Container>
			<Heading heading="Buckets" />
			<StateTemplate
				state="loading"
				heading="Loading buckets..."
				description="Please wait while we load your buckets"
			/>
		</Container>
	);
}

function ErrorComponent({ reset }: ErrorComponentProps) {
	return (
		<Container>
			<Heading heading="Buckets" />
			<StateTemplate
				state="error"
				heading="Failed to load buckets"
				description="We encountered an error while loading your buckets."
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
	const { data: buckets } = useSuspenseQuery(bucketsQueryOption);

	/**
	 * actions
	 */
	const handleOpenCreateBucketDialog = useCreateBucketDialogStore(
		(state) => state.handleOpen,
	);

	/**
	 * empty buckets
	 */
	if (buckets.length === 0) {
		return (
			<Container>
				<Heading heading="Buckets">
					<Button onClick={handleOpenCreateBucketDialog}>
						<Icon icon="bx:plus" />
						Create Bucket
					</Button>
				</Heading>
				<StateTemplate
					state="empty"
					heading="No buckets yet"
					description="Get started by creating your first bucket"
				>
					<div>
						<Button variant="secondary" onClick={handleOpenCreateBucketDialog}>
							<Icon icon="bx:plus" />
							Create Bucket
						</Button>
					</div>
				</StateTemplate>

				<CreateBucketDialog />
			</Container>
		);
	}

	return (
		<Container>
			<Heading heading="Buckets">
				<Button onClick={handleOpenCreateBucketDialog}>
					<Icon icon="bx:plus" />
					Create Bucket
				</Button>
			</Heading>
			<section className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
				{buckets?.map((bucket) => (
					<Card
						key={bucket.id}
						className="relative grid grid-rows-subgrid row-span-2 "
					>
						<BucketDropdownMenu id={bucket.id} />
						<CardHeader>
							<CardTitle>{bucket.name}</CardTitle>
							<CardDescription>{bucket.description}</CardDescription>
						</CardHeader>
						<CardFooter className="text-2xl font-bold justify-end">
							{formatCurrency(bucket.current_amount)}
						</CardFooter>
					</Card>
				))}
			</section>

			<CreateBucketDialog />
			<EditBucketDialog />
			<CreateTransactionDialog />
		</Container>
	);
}
