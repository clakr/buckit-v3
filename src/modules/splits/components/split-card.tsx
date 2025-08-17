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
import { Icon } from "@iconify/react/dist/iconify.js";

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
		<Card className="relative grid grid-rows-subgrid row-span-2">
			<SplitDropdownMenu id={split.id} />
			<CardHeader className="gap-y-1">
				<CardTitle>{split.name}</CardTitle>
				<CardDescription>
					<span className="flex items-center gap-x-2">
						<Icon icon="bx:money" className="size-4" />{" "}
						{formatCurrency(split.base_amount)}
					</span>
					<p>{split.description}</p>
				</CardDescription>
			</CardHeader>
			<CardContent className="flex items-center justify-between flex-wrap gap-y-1">
				<span className="text-muted-foreground text-sm">Allocated</span>
				<b className="font-semibold text-sm">
					{formatCurrency(totalAllocationsAccumulatedAmount)} (
					{formatPercentage(
						totalAllocationsAccumulatedAmount / split.base_amount,
					)}
					)
				</b>
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
