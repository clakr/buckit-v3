import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { Expense } from "@/integrations/supabase/types";
import { ExpenseDropdownMenu } from "@/modules/expenses/components/expense-dropdown-menu";

type Props = {
	expense: Expense;
};

export function ExpenseCard({ expense }: Props) {
	return (
		<Card className="relative">
			<ExpenseDropdownMenu id={expense.id} />
			<CardHeader>
				<CardTitle>{expense.name}</CardTitle>
				<CardDescription>{expense.description}</CardDescription>
			</CardHeader>
		</Card>
	);
}
