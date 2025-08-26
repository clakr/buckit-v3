import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Split, SplitAllocation } from "@/integrations/supabase/types";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { SplitDropdownMenu } from "@/modules/splits/components/split-dropdown-menu";
import { Icon } from "@iconify/react";

type Props = {
	split: Split & { split_allocations: SplitAllocation[] };
};

export function SplitCard({ split }: Props) {
	const totalAllocationsAccumulatedAmount = split.split_allocations.reduce(
		(accumulator, allocation) => {
			let amount = allocation.amount || 0;

			if (allocation.allocation_type === "percentage") {
				amount = (split.base_amount * (allocation.percentage || 0)) / 100;
			}

			return accumulator + amount;
		},
		0,
	);

	const remainingAmount = split.base_amount - totalAllocationsAccumulatedAmount;

	return (
		<Card className="relative grid grid-rows-subgrid row-span-4">
			<SplitDropdownMenu id={split.id} />
			<CardHeader className="grid grid-rows-subgrid row-span-3">
				<CardTitle>{split.name}</CardTitle>
				<span className="text-muted-foreground text-sm flex items-center gap-x-2">
					<Icon icon="bx:money" className="size-4" />{" "}
					{formatCurrency(split.base_amount)}
				</span>
				<CardDescription>{split.description}</CardDescription>
			</CardHeader>
			<CardContent className="flex items-center justify-between flex-wrap gap-y-1">
				<b className="font-semibold text-sm">
					{formatCurrency(totalAllocationsAccumulatedAmount)}
				</b>
				<span className="font-semibold text-sm">
					{formatPercentage(
						totalAllocationsAccumulatedAmount / split.base_amount,
						{
							maximumSignificantDigits: 2,
						},
					)}
				</span>
				<Progress
					value={(totalAllocationsAccumulatedAmount / split.base_amount) * 100}
				/>
				<span className="text-muted-foreground text-xs">
					Remaining: {formatCurrency(remainingAmount)}
				</span>
				<span className="text-muted-foreground text-xs">
					{split.split_allocations.length} allocations
				</span>
			</CardContent>
		</Card>
	);
}
