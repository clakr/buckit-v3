import { Container } from "@/components/container";
import { DataTable } from "@/components/data-table";
import { Heading } from "@/components/heading";
import { StateTemplate } from "@/components/states-template";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import {
	formatCurrency,
	formatDate,
	formatDateTime,
	indexMonthMapping,
} from "@/lib/utils";
import { columns } from "@/modules/buckets/columns";
import { bucketQueryOption } from "@/modules/buckets/query-options";
import { Icon } from "@iconify/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	type ErrorComponentProps,
	createFileRoute,
} from "@tanstack/react-router";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authed/buckets/$id/")({
	loader: async ({ context: { queryClient }, params: { id } }) => {
		await queryClient.ensureQueryData(bucketQueryOption(id));
	},
	pendingComponent: PendingComponent,
	errorComponent: ErrorComponent,
	component: RouteComponent,
});

function PendingComponent() {
	return (
		<Container>
			<Heading heading="Bucket" />
			<StateTemplate
				state="loading"
				heading="Loading bucket..."
				description="Please wait while we load your bucket"
			/>
		</Container>
	);
}

function ErrorComponent({ reset }: ErrorComponentProps) {
	return (
		<Container>
			<Heading heading="Bucket" />
			<StateTemplate
				state="error"
				heading="Failed to load bucket"
				description="We encountered an error while loading your bucket."
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
	const { data: bucket } = useSuspenseQuery(bucketQueryOption(id));

	if (!bucket)
		return (
			<Container>
				<Heading heading="Bucket" />
				<Empty className="border border-dashed">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Icon icon="mdi:bucket" />
						</EmptyMedia>
						<EmptyTitle>We can't find that bucket</EmptyTitle>
						<EmptyDescription>
							If you think this is a mistake, please contact us
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			</Container>
		);

	/**
	 * derived
	 */
	let totalDepositsAmount = 0;
	let totalDepositsCount = 0;

	let totalWithdrawalsAmount = 0;
	let totalWithdrawalsCount = 0;

	for (const transaction of bucket?.bucket_transactions ?? []) {
		if (transaction.type === "inbound") {
			totalDepositsAmount += transaction.amount;
			totalDepositsCount++;

			continue;
		}

		totalWithdrawalsAmount += transaction.amount;
		totalWithdrawalsCount++;
	}

	/**
	 * chart
	 */
	const transactionsByMonth = bucket.bucket_transactions.reduce<
		Record<number, number>
	>((acc, transaction) => {
		const month = new Date(transaction.created_at).getMonth();

		acc[month] = acc[month] || transaction.balance_after || 0;

		return acc;
	}, {});

	const chartData = Object.entries(transactionsByMonth).map(
		([month, balance]) => ({
			month: indexMonthMapping[+month],
			balance,
		}),
	);

	const chartConfig = {
		balance: {
			label: "Balance",
			color: "var(--chart-1)",
		},
	} satisfies ChartConfig;

	return (
		<Container>
			<Heading heading={bucket.name} description={bucket.description} />

			<div className="grid lg:grid-cols-3 gap-6">
				<Card className="gap-y-2">
					<CardHeader>
						<CardTitle>Current Balance</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col">
						<b className="text-2xl">{formatCurrency(bucket.current_amount)}</b>
						<span className="text-muted-foreground text-xs">
							Last updated {formatDate(bucket.updated_at)}
						</span>
					</CardContent>
				</Card>

				<Card className="gap-y-2">
					<CardHeader>
						<CardTitle>Total Deposits</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col">
						<b className="text-2xl">{formatCurrency(totalDepositsAmount)}</b>
						<span className="text-muted-foreground text-xs">
							{totalDepositsCount} deposits
						</span>
					</CardContent>
				</Card>

				<Card className="gap-y-2">
					<CardHeader>
						<CardTitle>Total Withdrawals</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col">
						<b className="text-2xl">{formatCurrency(totalWithdrawalsAmount)}</b>
						<span className="text-muted-foreground text-xs">
							{totalWithdrawalsCount} withdrawals
						</span>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-2xl">{bucket.name}</CardTitle>
					<CardDescription className="text-base">
						{bucket.description}
					</CardDescription>
				</CardHeader>
				<CardFooter className="text-sm text-muted-foreground gap-x-2 flex-wrap">
					<Icon icon="bx:calendar" />
					<span className="flex items-center gap-x-1 me-2">
						<b className="font-semibold whitespace-nowrap">Created</b>
						{formatDateTime(bucket.created_at)}
					</span>
					<span className="flex items-center gap-x-1">
						<b className="font-semibold whitespace-nowrap">Last Updated</b>
						{formatDateTime(bucket.updated_at)}
					</span>
				</CardFooter>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-2xl">Balance Trend</CardTitle>
					<CardDescription>Bucket balance over time</CardDescription>
				</CardHeader>
				<CardContent>
					{chartData.length > 1 ? (
						<ChartContainer config={chartConfig} className="h-[300px] w-full">
							<LineChart
								accessibilityLayer
								data={chartData}
								margin={{ left: 40, right: 40 }}
							>
								<CartesianGrid vertical={false} />
								<YAxis
									dataKey="balance"
									tickMargin={10}
									tickLine={false}
									axisLine={false}
									tickFormatter={(value) => formatCurrency(value)}
								/>
								<XAxis
									dataKey="month"
									tickMargin={10}
									tickLine={false}
									axisLine={false}
								/>
								<ChartTooltip content={<ChartTooltipContent hideLabel />} />
								<Line
									dataKey="balance"
									type="natural"
									stroke="var(--color-balance)"
									strokeWidth={2}
									dot={false}
								/>
							</LineChart>
						</ChartContainer>
					) : (
						<Empty className="border border-dashed">
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<Icon icon="mdi:chart-line" />
								</EmptyMedia>
								<EmptyTitle>Not enough data to generate chart</EmptyTitle>
								<EmptyDescription>
									Please add more transactions to this bucket to generate a
									chart
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-2xl">Transaction History</CardTitle>
					<CardDescription>
						All transactions for this bucket (
						{bucket.bucket_transactions.length} total)
					</CardDescription>
				</CardHeader>
				<CardContent>
					<DataTable data={bucket.bucket_transactions} columns={columns} />
				</CardContent>
			</Card>
		</Container>
	);
}
