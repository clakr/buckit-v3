import { Container } from "@/components/container";
import { Heading } from "@/components/heading";
import { StateTemplate } from "@/components/states-template";
import { Button } from "@/components/ui/button";
import { useAppForm } from "@/hooks/form";
import {
	ExpenseForm,
	expenseFormOptions,
} from "@/modules/expenses/components/expense-form";
import { useUpdateExpenseMutation } from "@/modules/expenses/mutations";
import { expenseQueryOption } from "@/modules/expenses/query-options";
import { updateExpenseFormSchema } from "@/modules/expenses/schemas";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	type ErrorComponentProps,
	createFileRoute,
} from "@tanstack/react-router";
import type z from "zod";

export const Route = createFileRoute("/_authed/expenses/$id/edit")({
	loader: async ({ context: { queryClient }, params: { id } }) => {
		await queryClient.ensureQueryData(expenseQueryOption(id));
	},
	pendingComponent: PendingComponent,
	errorComponent: ErrorComponent,
	component: RouteComponent,
});

function PendingComponent() {
	return (
		<Container>
			<Heading heading="Expense" />
			<StateTemplate
				state="loading"
				heading="Loading expense..."
				description="Please wait while we load your expense"
			/>
		</Container>
	);
}

function ErrorComponent({ reset }: ErrorComponentProps) {
	return (
		<Container>
			<Heading heading="Expense" />
			<StateTemplate
				state="error"
				heading="Failed to load expense"
				description="We encountered an error while loading your expense."
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
	const { id } = Route.useParams();
	const { data: expense } = useSuspenseQuery(expenseQueryOption(id));

	if (!expense)
		return (
			<Container>
				<Heading heading="Expense" />
				<StateTemplate
					state="empty"
					heading="We can't find that expense"
					description="If you think this is a mistake, please contact us"
				/>
			</Container>
		);

	/**
	 * form
	 */
	const navigate = Route.useNavigate();

	const mutation = useUpdateExpenseMutation();

	const defaultValues: z.input<typeof updateExpenseFormSchema> = {
		id: expense.id,
		name: expense.name,
		description: expense.description,
		status: expense.status,
	};

	const form = useAppForm({
		...expenseFormOptions,
		defaultValues,
		validators: {
			onChange: updateExpenseFormSchema,
		},
		onSubmit: async ({ value }) => {
			const payload = updateExpenseFormSchema.parse(value);

			mutation.mutate(payload);

			form.reset();

			navigate({
				to: "/expenses",
			});
		},
	});

	return (
		<Container>
			<Heading heading={expense.name} />

			<ExpenseForm form={form} intent="update" />
		</Container>
	);
}
