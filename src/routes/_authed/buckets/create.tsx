import { useAppForm } from "@/hooks/form";
import { useCreateBucket } from "@/modules/buckets/mutations";
import { createBucketFormSchema } from "@/modules/buckets/schemas";
import { Icon } from "@iconify/react";
import { createFileRoute } from "@tanstack/react-router";
import type z from "zod";

export const Route = createFileRoute("/_authed/buckets/create")({
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = Route.useNavigate();

	const mutation = useCreateBucket();

	const defaultValues: z.input<typeof createBucketFormSchema> = {
		name: "",
		description: "",
		current_amount: 0,
	};

	const form = useAppForm({
		defaultValues,
		validators: {
			onBlur: createBucketFormSchema,
		},
		onSubmit: async ({ value }) => {
			const payload = createBucketFormSchema.parse(value);

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
			<form.AppField name="name">
				{(field) => <field.Input label="Name" id="name" type="text" />}
			</form.AppField>
			<form.AppField name="description">
				{(field) => <field.Textarea label="Description" id="description" />}
			</form.AppField>
			<form.AppField name="current_amount">
				{(field) => (
					<field.Input
						label="Initial Amount"
						id="current-amount"
						type="number"
					/>
				)}
			</form.AppField>
			<form.AppForm>
				<form.Button className="self-end">
					<Icon icon="bx:plus" />
					Create Bucket
				</form.Button>
			</form.AppForm>
		</form>
	);
}
