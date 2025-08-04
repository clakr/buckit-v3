import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Goal } from "@/integrations/supabase/types";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { GoalDropdownMenu } from "@/modules/goals/component/goal-dropdown-menu";

type Props = {
	goal: Goal;
};

export function GoalCard({ goal }: Props) {
	const progress = goal.current_amount / goal.target_amount;

	return (
		<Card className="relative grid grid-rows-subgrid row-span-2">
			<GoalDropdownMenu id={goal.id} />
			<CardHeader className="gap-y-1">
				<CardTitle>{goal.name}</CardTitle>
				<CardDescription>{goal.description}</CardDescription>
			</CardHeader>
			<CardFooter className="flex flex-col text-sm gap-y-1">
				<b className="self-end">{formatPercentage(progress)}</b>
				<Progress value={progress * 100} />
				<span className="self-end">
					{formatCurrency(goal.current_amount)} of{" "}
					<b>{formatCurrency(goal.target_amount)}</b>
				</span>
			</CardFooter>
		</Card>
	);
}
