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
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase";
import type { UserBucket } from "@/integrations/supabase/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Icon } from "@iconify/react/dist/iconify.js";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

function queryOption(id: UserBucket["id"]) {
	return queryOptions({
		queryKey: ["bucket", id],
		queryFn: async () => {
			const { data } = await supabase
				.from("user_buckets")
				.select("*")
				.eq("id", id)
				.single();

			return data;
		},
	});
}

export const Route = createFileRoute("/_authed/buckets/$id")({
	component: RouteComponent,
	loader: async ({ context: { queryClient }, params: { id } }) => {
		await queryClient.ensureQueryData(queryOption(id));
	},
});

function RouteComponent() {
	const { id } = Route.useParams();
	const { data: bucket } = useSuspenseQuery(queryOption(id));

	if (!bucket) return <div>no bucket</div>;

	return (
		<div className="grid gap-6 xl:grid-cols-2">
			<Card className="shadow-none">
				<CardHeader className="gap-y-0">
					<CardTitle className="text-2xl flex items-center gap-x-2">
						<Icon icon="tabler:bucket" />
						Bucket Information
					</CardTitle>
					<CardDescription>Basic information about this bucket</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-y-6">
					<dl>
						<DescriptionTerm>Name</DescriptionTerm>
						<dd className="mb-4 font-semibold">{bucket.name}</dd>
						<DescriptionTerm>Description</DescriptionTerm>
						<dd className="text-sm">{bucket.description}</dd>
					</dl>
					<Separator />
				</CardContent>
				<CardFooter className="flex-col items-start gap-y-4">
					<dl>
						<DescriptionTerm>Current Amount</DescriptionTerm>
						<dd className="text-2xl font-bold">
							{formatCurrency(bucket.current_amount)}
						</dd>
					</dl>
					<div className="flex items-center gap-x-1">
						{bucket.is_owner ? (
							<Badge className="capitalize">
								<Icon icon="bx:user" />
								Owner
							</Badge>
						) : null}
						<Badge variant="outline">
							{bucket.is_active ? "Active" : "Inactive"}
						</Badge>
					</div>
				</CardFooter>
			</Card>
			<Card className="shadow-none">
				<CardHeader className="gap-y-0">
					<CardTitle className="text-2xl flex items-center gap-x-2">
						<Icon icon="bx:cog" />
						Metadata
					</CardTitle>
					<CardDescription>System information and permissions</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-y-6">
					<dl>
						<DescriptionTerm>Bucket ID</DescriptionTerm>
						<dd className="mb-4 font-mono text-sm p-2 bg-neutral-200">
							{bucket.id}
						</dd>
						<DescriptionTerm>Your Role</DescriptionTerm>
						<Badge variant="outline" className="capitalize mb-4">
							{bucket.user_role}
						</Badge>
						<DescriptionTerm>Owner ID</DescriptionTerm>
						<dd className="font-mono text-sm p-2 bg-neutral-200">
							{bucket.owner_id}
						</dd>
					</dl>
					<Separator />
				</CardContent>
				<CardFooter className="flex-col items-start gap-y-4">
					<dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
						<DescriptionTerm className="flex items-center gap-x-1">
							<Icon icon="bx:calendar" />
							Created:
						</DescriptionTerm>
						<dd className="text-sm">{formatDate(bucket.created_at)}</dd>
						<DescriptionTerm className="flex items-center gap-x-1">
							<Icon icon="bx:calendar" />
							Updated:
						</DescriptionTerm>
						<dd className="text-sm">{formatDate(bucket.updated_at)}</dd>
					</dl>
				</CardFooter>
			</Card>
			<Card className="shadow-none col-span-full">
				<CardHeader className="gap-y-0">
					<CardTitle className="text-2xl flex items-center gap-x-2">
						<Icon icon="bx:cog" />
						Actions
					</CardTitle>
					<CardDescription>Manage this Bucket</CardDescription>
				</CardHeader>
				<CardContent className="flex gap-x-2">
					<Button disabled>
						<Icon icon="bx:edit" />
						Edit Bucket
					</Button>
					<Button variant="secondary" disabled>
						<Icon icon="bx:trash" />
						Delete Bucket
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}

function DescriptionTerm({
	children,
	className,
	...props
}: React.ComponentProps<"dt">) {
	return (
		<dt
			{...props}
			className={cn("text-muted-foreground text-sm font-medium", className)}
		>
			{children}
		</dt>
	);
}
