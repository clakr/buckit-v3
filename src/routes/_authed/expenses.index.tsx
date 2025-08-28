import { Container } from "@/components/container";
import { Heading } from "@/components/heading";
import { StateTemplate } from "@/components/states-template";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExpenseCard } from "@/modules/expenses/components/expense-card";
import { expensesQueryOption } from "@/modules/expenses/query-options";
import { Icon } from "@iconify/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	type ErrorComponentProps,
	Link,
	createFileRoute,
} from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/expenses/")({
	loader: async ({ context: { queryClient } }) => {
		await Promise.allSettled([
			queryClient.ensureQueryData(expensesQueryOption),
		]);
	},
	pendingComponent: PendingComponent,
	errorComponent: ErrorComponent,
	component: RouteComponent,
});

function PendingComponent() {
	return (
		<Container>
			<Heading heading="Expenses" />
			<StateTemplate
				state="loading"
				heading="Loading expenses..."
				description="Please wait while we load your expenses"
			/>
		</Container>
	);
}

function ErrorComponent({ reset }: ErrorComponentProps) {
	return (
		<Container>
			<Heading heading="Expenses" />
			<StateTemplate
				state="error"
				heading="Failed to load expenses"
				description="We encountered an error while loading your expenses."
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
	 * data fetching
	 */
	const { data: expenses } = useSuspenseQuery(expensesQueryOption);

	if (expenses.length === 0) {
		return (
			<Container>
				<Heading heading="Expenses">
					<Button asChild>
						<Link to="/expenses/create">
							<Icon icon="bx:plus" />
							Create Expense
						</Link>
					</Button>
				</Heading>
				<StateTemplate
					state="empty"
					heading="No expenses yet"
					description="Get started by creating your first expense"
				>
					<div>
						<Button variant="secondary" asChild>
							<Link to="/expenses/create">
								<Icon icon="bx:plus" />
								Create Expense
							</Link>
						</Button>
					</div>
				</StateTemplate>
			</Container>
		);
	}

	return (
		<Container>
			<Heading heading="Expenses">
				<Button asChild>
					<Link to="/expenses/create">
						<Icon icon="bx:plus" />
						Create Expense
					</Link>
				</Button>
			</Heading>
			<section className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
				{expenses.map((expense) => (
					<ExpenseCard key={expense.id} expense={expense} />
				))}
			</section>
		</Container>
	);
}
