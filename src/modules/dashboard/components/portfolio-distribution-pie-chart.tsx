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
import { formatCurrency, slugify } from "@/lib/utils";
import { bucketsQueryOption } from "@/modules/buckets/query-options";
import { goalsQueryOption } from "@/modules/goals/query-options";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Label, LabelList, Pie, PieChart } from "recharts";

export function PortfolioDistributionPieChart() {
	const { data: buckets } = useSuspenseQuery(bucketsQueryOption);
	const { data: goals } = useSuspenseQuery(goalsQueryOption);

	const data = [...buckets, ...goals];
	const validData = data.filter((d) => d.current_amount > 0);

	const totalAccumulated = data.reduce(
		(acc, current) => acc + current.current_amount,
		0,
	);

	const chartData = validData.map((d) => ({
		name: d.name,
		amount: d.current_amount,
		fill: `var(--color-${slugify(d.name)})`,
	}));

	const chartConfig = {
		amount: {
			label: "Amount",
		},
		...validData.reduce<Record<string, { label: string; color: string }>>(
			(acc, current) => {
				const color = buckets.some((bucket) => bucket.id === current.id)
					? "var(--chart-1)"
					: "var(--chart-2)";

				acc[slugify(current.name)] = {
					label: current.name,
					color,
				};

				return acc;
			},
			{},
		),
	} satisfies ChartConfig;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Portfolio Distribution</CardTitle>
				<CardDescription>
					Your total balance of {formatCurrency(totalAccumulated)} distributed
					across all buckets and goals
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer
					config={chartConfig}
					className="mx-auto aspect-square h-[300px]"
				>
					<PieChart>
						<ChartTooltip
							cursor={false}
							content={<ChartTooltipContent hideLabel />}
						/>
						<Pie
							data={chartData}
							dataKey="amount"
							nameKey="name"
							innerRadius={"50%"}
							stroke="#dad9d4"
						>
							<Label
								content={({ viewBox }) => {
									if (viewBox && "cx" in viewBox && "cy" in viewBox) {
										return (
											<text
												x={viewBox.cx}
												y={viewBox.cy}
												textAnchor="middle"
												dominantBaseline="middle"
											>
												<tspan
													x={viewBox.cx}
													y={viewBox.cy}
													className="fill-foreground text-xl font-bold"
												>
													{formatCurrency(totalAccumulated)}
												</tspan>
												<tspan
													x={viewBox.cx}
													y={(viewBox.cy || 0) + 24}
													className="fill-muted-foreground"
												>
													Total Amount
												</tspan>
											</text>
										);
									}
								}}
							/>
							<LabelList
								dataKey="name"
								className="fill-background"
								stroke="none"
								fontSize={12}
							/>
						</Pie>
					</PieChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
