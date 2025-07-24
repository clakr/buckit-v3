import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase";
import { getErrorMessage } from "@/integrations/supabase/utils";
import { formatToCurrency } from "@/lib/utils";
import { BucketDropdownMenu } from "@/modules/buckets/components/bucket-dropdown-menu";
import { Icon } from "@iconify/react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

const queryOption = queryOptions({
	queryKey: ["buckets"],
	queryFn: async () => {
		const { error, data } = await supabase.from("user_buckets").select("*");

		if (error) {
			toast.error(getErrorMessage(error.code));
			return [];
		}

		return data;
	},
});

export const Route = createFileRoute("/_authed/buckets/")({
	component: RouteComponent,
	loader: async ({ context: { queryClient } }) => {
		await queryClient.ensureQueryData(queryOption);
	},
});

function RouteComponent() {
	const { data: buckets } = useSuspenseQuery(queryOption);

	return (
		<>
			<Button asChild>
				<Link to="/buckets/create">
					<Icon icon="bx:plus" />
					Create Bucket
				</Link>
			</Button>
			<section className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
				{buckets.map((bucket) => (
					<Card
						key={bucket.id}
						className="relative grid grid-rows-subgrid row-span-2"
					>
						<BucketDropdownMenu />
						<CardHeader>
							<CardTitle>{bucket.name}</CardTitle>
							<CardDescription>{bucket.description}</CardDescription>
						</CardHeader>
						<CardFooter className="justify-between">
							<div className="flex flex-wrap gap-1">
								<Badge
									variant={
										bucket.user_role === "owner" ? "default" : "secondary"
									}
									className="capitalize"
								>
									{bucket.user_role}
								</Badge>
								<Badge variant={bucket.is_active ? "default" : "secondary"}>
									{bucket.is_active ? "Active" : "Inactive"}
								</Badge>
							</div>
							<strong className="text-2xl font-bold justify-end">
								{formatToCurrency(bucket.current_amount)}
							</strong>
						</CardFooter>
					</Card>
				))}
			</section>
		</>
	);
}
