import { useAppForm } from "@/hooks/form";
import { useCreateBucketTransaction } from "@/modules/buckets/mutations";
import {
	createBucketTransactionFormSchema,
	transactionTypeEnum,
} from "@/modules/buckets/schemas";
import { Icon } from "@iconify/react";
import { createFileRoute } from "@tanstack/react-router";
import type z from "zod";

export const Route = createFileRoute("/_authed/buckets/$id/create-transaction")(
	{
		component: RouteComponent,
	},
);

function RouteComponent() {
	const { id } = Route.useParams();
	const navigate = Route.useNavigate();

	const mutation = useCreateBucketTransaction();

	const defaultValues: z.input<typeof createBucketTransactionFormSchema> = {
		bucket_id: id,
		description: "",
		amount: 0,
		type: "inbound",
	};

	const form = useAppForm({
		defaultValues,
		validators: {
			onBlur: createBucketTransactionFormSchema,
		},
		onSubmit: async ({ value }) => {
			const payload = createBucketTransactionFormSchema.parse(value);

			mutation.mutate(payload);

			navigate({ to: "/buckets" });
		},
	});

	return (
		<form
			className="flex flex-col gap-y-4"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				form.handleSubmit();
			}}
		>
			<form.AppField name="description">
				{(field) => (
					<field.Input label="Description" id="description" type="text" />
				)}
			</form.AppField>
			<form.AppField name="amount">
				{(field) => <field.Input label="Amount" id="amount" type="number" />}
			</form.AppField>
			<form.AppField name="type">
				{(field) => (
					<field.Radio
						label="Type"
						id="type"
						enumSchema={transactionTypeEnum}
					/>
				)}
			</form.AppField>
			<form.AppForm>
				<form.Button className="self-end">
					<Icon icon="bx:plus" />
					Create Transaction
				</form.Button>
			</form.AppForm>
		</form>
	);
}
