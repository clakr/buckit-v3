import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { goalsQueryOption } from "@/modules/goals/query-options";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";

export function GoalsProgressBarChart() {
	const { data: goals } = useSuspenseQuery(goalsQueryOption);

	const chartData = goals.map((goal) => ({
		name: goal.name,
		current_amount: goal.current_amount,
		target_amount: goal.target_amount,

		remaining: goal.target_amount - goal.current_amount,
		progress: formatPercentage(goal.current_amount / goal.target_amount, {
			maximumSignificantDigits: 2,
		}),
	}));

	const chartConfig = {
		current_amount: {
			label: "Current Amount",
			color: "var(--chart-2)",
		},
		target_amount: {
			label: "Target Amount",
			color: "var(--chart-1)",
		},
	} satisfies ChartConfig;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Goal Progress</CardTitle>
				<CardDescription>
					Monitor your progress towards financial goals and projected completion
					dates
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig} className="w-full h-[300px]">
					<BarChart
						accessibilityLayer
						data={chartData}
						layout="vertical"
						margin={{ right: 50 }}
					>
						<XAxis type="number" hide />
						<YAxis
							dataKey="name"
							type="category"
							axisLine={false}
							tickLine={false}
						/>
						<ChartTooltip
							cursor={false}
							content={<ChartTooltipContent hideLabel />}
						/>
						<Bar
							dataKey="current_amount"
							stackId="a"
							fill="var(--color-current_amount)"
							radius={[5, 0, 0, 5]}
						>
							<LabelList
								dataKey="current_amount"
								position="center"
								className="fill-background"
								formatter={(value: number) => formatCurrency(value)}
							/>
						</Bar>
						<Bar
							dataKey="target_amount"
							stackId="a"
							fill="var(--color-target_amount)"
							radius={[0, 5, 5, 0]}
						>
							<LabelList
								dataKey="remaining"
								position="center"
								className="fill-background"
								formatter={(value: number) => formatCurrency(value)}
							/>
							<LabelList
								dataKey="progress"
								position="right"
								className="fill-foreground font-medium"
							/>
						</Bar>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
