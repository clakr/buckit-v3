import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { bucketTransactionsColumns } from "@/modules/buckets/columns";
import { bucketQueryOption } from "@/modules/buckets/query-options";
import { Icon } from "@iconify/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/buckets/$id/")({
	component: RouteComponent,
	loader: async ({ context: { queryClient }, params: { id } }) => {
		await queryClient.ensureQueryData(bucketQueryOption(id));
	},
});

function RouteComponent() {
	/**
	 * fetching data
	 */
	const { id } = Route.useParams();
	const { data: bucket } = useSuspenseQuery(bucketQueryOption(id));

	/**
	 * bucket transactions
	 */
	let totalInboundTransactionsAmount = 0;
	let totalInboundTransactionsCount = 0;

	let totalOutboundTransactionsAmount = 0;
	let totalOutboundTransactionsCount = 0;

	let netChange = 0;

	for (const transaction of bucket?.bucket_transactions ?? []) {
		if (transaction.type === "inbound") {
			totalInboundTransactionsAmount += transaction.amount;
			totalInboundTransactionsCount++;

			netChange += transaction.amount;
			continue;
		}

		totalOutboundTransactionsAmount += transaction.amount;
		totalOutboundTransactionsCount++;

		netChange -= transaction.amount;
	}

	if (!bucket) return <div>no bucket</div>;

	return (
		<div className="p-6 flex flex-col gap-y-6">
			<div className="flex gap-x-4 items-center">
				<Button asChild variant="ghost" size="icon">
					<Link to="..">
						<Icon icon="bx:left-arrow-alt" className="size-6" />
					</Link>
				</Button>
				<div className="grow">
					<h1 className="text-2xl font-bold capitalize">{bucket.name}</h1>
					<span className="text-muted-foreground text-sm">
						Created {formatDate(bucket.created_at)}
					</span>
				</div>
				<div>
					{/* <Button variant="outline" size="icon">
						<Icon icon="bx:dots-vertical-rounded" />
					</Button> */}
				</div>
			</div>

			<div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
				<Card className="shadow-none">
					<CardContent className="flex flex-col gap-y-2">
						<h3 className="text-sm text-muted-foreground font-semibold">
							Current Balance
						</h3>
						<b className="text-2xl">{formatCurrency(bucket.current_amount)}</b>
					</CardContent>
				</Card>

				<Card className="shadow-none">
					<CardContent className="flex flex-col gap-y-2">
						<h3 className="text-sm text-muted-foreground font-semibold">
							Total Inbound Transactions
						</h3>
						<b className="text-2xl">
							{formatCurrency(totalInboundTransactionsAmount)}
						</b>
						<small className="text-xs text-muted-foreground">
							{totalInboundTransactionsCount}{" "}
							{totalInboundTransactionsCount > 1
								? "transactions"
								: "transaction"}
						</small>
					</CardContent>
				</Card>

				<Card className="shadow-none">
					<CardContent className="flex flex-col gap-y-2">
						<h3 className="text-sm text-muted-foreground font-semibold">
							Total Outbound Transactions
						</h3>
						<b className="text-2xl">
							{formatCurrency(totalOutboundTransactionsAmount)}
						</b>
						<small className="text-xs text-muted-foreground">
							{totalOutboundTransactionsCount}{" "}
							{totalOutboundTransactionsCount > 1
								? "transactions"
								: "transaction"}
						</small>
					</CardContent>
				</Card>

				<Card className="shadow-none">
					<CardContent className="flex flex-col gap-y-2">
						<h3 className="text-sm text-muted-foreground font-semibold">
							Net Change
						</h3>
						<b className="text-2xl">{formatCurrency(netChange)}</b>
						<small className="text-xs text-muted-foreground">
							{bucket.bucket_transactions.length} transactions
						</small>
					</CardContent>
				</Card>
			</div>

			<Card className="shadow-none">
				<CardHeader>
					<CardTitle>Description</CardTitle>
					<CardDescription>{bucket.description}</CardDescription>
				</CardHeader>
			</Card>

			<Card className="shadow-none">
				<CardHeader>
					<CardTitle>Transaction History</CardTitle>
					<CardDescription>All transactions for this bucket</CardDescription>
				</CardHeader>
				<CardContent>
					<DataTable
						columns={bucketTransactionsColumns}
						data={bucket.bucket_transactions}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
