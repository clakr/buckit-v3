import { Badge } from "@/components/ui/badge";
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
import { bucketsQueryOption } from "@/modules/buckets/query-options";
import { Icon } from "@iconify/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/buckets/")({
	component: RouteComponent,
	loader: async ({ context: { queryClient } }) => {
		await queryClient.ensureQueryData(bucketsQueryOption);
	},
});

function RouteComponent() {
	const { data: buckets } = useSuspenseQuery(bucketsQueryOption);

	return (
		<>
			<Button asChild className="self-end">
				<Link to="/buckets/create">
					<Icon icon="bx:plus" />
					Create Bucket
				</Link>
			</Button>
			<section className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
				{buckets?.map((bucket) => (
					<Card
						key={bucket.id}
						className="relative grid grid-rows-subgrid row-span-2"
					>
						<BucketDropdownMenu id={bucket.id} />
						<CardHeader>
							<CardTitle>{bucket.name}</CardTitle>
							<CardDescription>{bucket.description}</CardDescription>
						</CardHeader>
						<CardFooter className="justify-between">
							<div className="flex flex-wrap gap-1">
								<Badge variant={bucket.is_active ? "default" : "outline"}>
									{bucket.is_active ? "Active" : "Inactive"}
								</Badge>
							</div>
							<strong className="text-2xl font-bold justify-end">
								{formatCurrency(bucket.current_amount)}
							</strong>
						</CardFooter>
					</Card>
				))}
			</section>
		</>
	);
}
