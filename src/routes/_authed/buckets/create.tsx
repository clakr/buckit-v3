import { useAppForm } from "@/hooks/form";
import { supabase } from "@/integrations/supabase";
import { getErrorMessage } from "@/integrations/supabase/utils";
import { Icon } from "@iconify/react/dist/iconify.js";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";

export const Route = createFileRoute("/_authed/buckets/create")({
	component: RouteComponent,
});

const schema = z.object({
	id: z
		.string()
		.uuid()
		.default(() => crypto.randomUUID()),
	name: z
		.string()
		.nonempty("Name is required")
		.max(255, "Name must be less than 255 characters"),
	description: z.string().nullable(),
	current_amount: z.coerce
		.number()
		.min(
			-999999999999.9999,
			"Current amount must be greater than -999999999999.9999",
		)
		.max(
			999999999999.9999,
			"Current amount must be less than 999999999999.9999",
		)
		.nullable()
		.default(0),
});

function RouteComponent() {
	const form = useAppForm({
		defaultValues: {
			name: "",
			description: "",
			current_amount: 0,
		} as z.input<typeof schema>,
		validators: {
			onBlur: schema,
		},
		onSubmit: async ({ value }) => {
			const { error } = await supabase
				.from("buckets")
				.insert({ ...schema.parse(value) });

			if (error) {
				toast.error(getErrorMessage(error.code));
				return;
			}
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
