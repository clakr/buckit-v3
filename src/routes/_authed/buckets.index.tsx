import { Container } from "@/components/container";
import { Heading } from "@/components/heading";
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
import { bucketsQueryOption } from "@/modules/buckets/query-options";
import { Icon } from "@iconify/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/buckets/")({
	component: RouteComponent,
	loader: async ({ context: { queryClient } }) => {
		await queryClient.ensureQueryData(bucketsQueryOption);
	},
});

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
		</Container>
	);
}
