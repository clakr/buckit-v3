import { Container } from "@/components/container";
import { Heading } from "@/components/heading";
import { useAppForm } from "@/hooks/form";
import {
	ExpenseForm,
	expenseFormOptions,
} from "@/modules/expenses/components/expense-form";
import { useCreateExpenseMutation } from "@/modules/expenses/mutations";
import { createExpenseFormSchema } from "@/modules/expenses/schemas";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/expenses/create")({
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = Route.useNavigate();

	const mutation = useCreateExpenseMutation();

	const form = useAppForm({
		...expenseFormOptions,
		validators: {
			onChange: createExpenseFormSchema,
		},
		onSubmit: async ({ value }) => {
			const payload = createExpenseFormSchema.parse(value);

			mutation.mutate(payload);

			form.reset();

			navigate({
				to: "/expenses",
			});
		},
	});

	return (
		<Container>
			<Heading heading="Create Expense" />
			<ExpenseForm form={form} intent="create" />
		</Container>
	);
}
