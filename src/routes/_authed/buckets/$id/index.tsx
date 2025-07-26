import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { bucketQueryOption } from "@/modules/buckets/query-options";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/buckets/$id/")({
	component: RouteComponent,
	loader: async ({ context: { queryClient }, params: { id } }) => {
		await queryClient.ensureQueryData(bucketQueryOption(id));
	},
});

function RouteComponent() {
	const { id } = Route.useParams();
	const { data: bucket } = useSuspenseQuery(bucketQueryOption(id));

	if (!bucket) return <div>no bucket</div>;

	return (
		<div className="grid gap-4 lg:grid-cols-2">
			<Card className="shadow-none col-span-full relative">
				<CardHeader className="gap-y-0">
					<CardTitle className="text-2xl">{bucket.name}</CardTitle>
					<CardDescription>Total amount saved in this bucket</CardDescription>
				</CardHeader>
				<CardContent className="text-4xl font-bold">
					{formatCurrency(bucket.current_amount)}
				</CardContent>
				<CardFooter className="grid gap-2 lg:grid-cols-2">
					<Button disabled>
						<Icon icon="bx:plus" />
						Add Money
					</Button>
					<Button variant="outline" disabled>
						<Icon icon="bx:minus" />
						Withdraw
					</Button>
				</CardFooter>
				<Icon
					icon="bx:money"
					className="size-8 absolute top-6 right-6 text-muted-foreground"
				/>
			</Card>
			<Card className="shadow-none">
				<CardHeader>
					<CardTitle className="text-2xl">Description</CardTitle>
					<CardDescription className="text-base">
						{bucket.description}
					</CardDescription>
				</CardHeader>
			</Card>
			<Card className="shadow-none">
				<CardHeader>
					<CardTitle className="text-2xl">Details</CardTitle>
				</CardHeader>
				<CardContent>
					<dl className="grid grid-cols-2 text-sm gap-2">
						<dt className="font-semibold">Status</dt>
						<dd className="text-end">
							<Badge variant={bucket.is_active ? "default" : "outline"}>
								{bucket.is_active ? "Active" : "Inactive"}
							</Badge>
						</dd>
						<dt className="font-semibold">Created</dt>
						<dd className="text-end text-muted-foreground font-medium">
							{formatDate(bucket.created_at)}
						</dd>
						<dt className="font-semibold">Last Updated</dt>
						<dd className="text-end text-muted-foreground font-medium">
							{formatDate(bucket.updated_at)}
						</dd>
					</dl>
				</CardContent>
			</Card>
			<Card className="col-span-full shadow-none">
				<CardHeader className="gap-y-0">
					<CardTitle className="text-2xl">Actions</CardTitle>
					<CardDescription>Manage this bucket</CardDescription>
				</CardHeader>
				<CardContent className="flex gap-x-2">
					<Button asChild>
						<Link
							to="/buckets/$id/edit"
							params={{
								id: bucket.id,
							}}
						>
							<Icon icon="bx:edit" />
							Edit Bucket
						</Link>
					</Button>
					<Button variant="outline" disabled>
						<Icon icon="bx:trash" />
						Delete Bucket
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
