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
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import type { GoalTransaction } from "@/integrations/supabase/types";
import {
	formatCurrency,
	formatDate,
	formatDateISO,
	formatDateTime,
	formatPercentage,
	indexMonthMapping,
} from "@/lib/utils";
import { columns } from "@/modules/goals/columns";
import { goalQueryOption } from "@/modules/goals/query-options";
import { Icon } from "@iconify/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	type ErrorComponentProps,
	createFileRoute,
} from "@tanstack/react-router";
import {
	CartesianGrid,
	Line,
	LineChart,
	Pie,
	PieChart,
	XAxis,
	YAxis,
} from "recharts";

export const Route = createFileRoute("/_authed/goals/$id/")({
	loader: async ({ context: { queryClient }, params: { id } }) => {
		await queryClient.ensureQueryData(goalQueryOption(id));
	},
	pendingComponent: PendingComponent,
	errorComponent: ErrorComponent,
	component: RouteComponent,
});

function PendingComponent() {
	return (
		<Container>
			<Heading heading="Goal" />
			<StateTemplate
				state="loading"
				heading="Loading goal..."
				description="Please wait while we load your goal"
			/>
		</Container>
	);
}

function ErrorComponent({ reset }: ErrorComponentProps) {
	return (
		<Container>
			<Heading heading="Goal" />
			<StateTemplate
				state="error"
				heading="Failed to load goal"
				description="We encountered an error while loading your goal."
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
	const { data: goal } = useSuspenseQuery(goalQueryOption(id));

	if (!goal)
		return (
			<Container>
				<Heading heading="Goal" />
				<StateTemplate
					state="empty"
					heading="We can't find that goal"
					description="If you think this is a mistake, please contact us"
				/>
			</Container>
		);

	/**
	 * derived
	 */
	const progress = goal.current_amount / goal.target_amount;
	const remainingAmount = goal.target_amount - goal.current_amount;

	/**
	 * chart
	 */

	const pieChartData = [
		{
			category: "current",
			amount: goal.current_amount,
			fill: "var(--color-current)",
		},
		{
			category: "remaining",
			amount: remainingAmount,
			fill: "var(--color-remaining)",
		},
	];
	const pieChartConfig = {
		amount: {
			label: "Visitors",
		},
		current: {
			label: "Current Amount",
			color: "var(--chart-1)",
		},
		remaining: {
			label: "Remaining Amount",
			color: "var(--chart-2)",
		},
	} satisfies ChartConfig;

	const transactionsByMonth = goal.goal_transactions.reduce<
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
			<Heading heading={goal.name} description={goal.description} />

			<div className="grid lg:grid-cols-3 gap-6">
				<Card className="gap-y-2">
					<CardHeader>
						<CardTitle>Current Amount</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col">
						<b className="text-2xl">{formatCurrency(goal.current_amount)}</b>
						<span className="text-muted-foreground text-xs">
							{formatPercentage(progress)} of target reached
						</span>
					</CardContent>
				</Card>

				<Card className="gap-y-2">
					<CardHeader>
						<CardTitle>Target Amount</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col">
						<b className="text-2xl">{formatCurrency(goal.target_amount)}</b>
						<span className="text-muted-foreground text-xs">
							{formatCurrency(remainingAmount)} remaining
						</span>
					</CardContent>
				</Card>

				<Card className="gap-y-2">
					<CardHeader>
						<CardTitle>Progress</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col">
						<b className="text-2xl">
							{formatPercentage(progress, {
								maximumSignificantDigits: 2,
							})}
						</b>
						<Progress value={progress * 100} className="h-3" />
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-2xl">{goal.name}</CardTitle>
					<CardDescription className="text-base">
						{goal.description}
					</CardDescription>
				</CardHeader>
				<CardFooter className="text-sm text-muted-foreground gap-x-2 flex-wrap">
					<Icon icon="bx:calendar" />
					<span className="flex items-center gap-x-1 me-2">
						<b className="font-semibold whitespace-nowrap">Created</b>
						{formatDateTime(goal.created_at)}
					</span>
					<span className="flex items-center gap-x-1">
						<b className="font-semibold whitespace-nowrap">Last Updated</b>
						{formatDateTime(goal.updated_at)}
					</span>
				</CardFooter>
			</Card>

			<div className="grid gap-6 xl:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="text-2xl">Goal Progress</CardTitle>
						<CardDescription>Current vs Target Amount</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer
							config={pieChartConfig}
							className="mx-auto aspect-square h-[300px] w-full [&_.recharts-pie-label-text]:fill-foreground"
						>
							<PieChart>
								<ChartTooltip content={<ChartTooltipContent hideLabel />} />
								<Pie
									data={pieChartData}
									dataKey="amount"
									label
									nameKey="category"
								/>
								<ChartLegend
									content={<ChartLegendContent nameKey="category" />}
									className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
								/>
							</PieChart>
						</ChartContainer>
					</CardContent>
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
							<StateTemplate
								state="empty"
								heading="Not enough data to generate chart"
								description="Please add more transactions to this goal to generate a chart"
							/>
						)}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-2xl">Transaction History</CardTitle>
					<CardDescription>
						All transactions for this bucket ({goal.goal_transactions.length}{" "}
						total)
					</CardDescription>
				</CardHeader>
				<CardContent>
					<DataTable data={goal.goal_transactions} columns={columns} />
				</CardContent>
			</Card>
		</Container>
	);
}
