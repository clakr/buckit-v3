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

type Props = {
	goal: Goal;
};

export function GoalCard({ goal }: Props) {
	const progressRaw = goal.current_amount / goal.target_amount;
	const progress = progressRaw * 100;

	return (
		<Card>
			<CardHeader>
				<CardTitle>{goal.name}</CardTitle>
				<CardDescription>{goal.description}</CardDescription>
			</CardHeader>
			<CardFooter className="flex flex-col text-sm gap-y-1">
				<b className="self-end">{formatPercentage(progressRaw)}</b>
				<Progress value={progress} />
				<span className="self-end">
					{formatCurrency(goal.current_amount)} of{" "}
					<b>{formatCurrency(goal.target_amount)}</b>
				</span>
			</CardFooter>
		</Card>
	);
}
