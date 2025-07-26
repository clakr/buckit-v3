import { withForm } from "@/hooks/form";
import { Icon } from "@iconify/react/dist/iconify.js";
import { formOptions } from "@tanstack/react-form";
import z from "zod";

export const createEditBucketSchema = z.object({
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

export const createEditBucketFormOpts = formOptions({
	defaultValues: {
		name: "",
		description: "",
		current_amount: 0,
	} as z.input<typeof createEditBucketSchema>,
	validators: {
		onBlur: createEditBucketSchema,
	},
});

export const CreateEditBucketForm = withForm({
	...createEditBucketFormOpts,
	props: {
		intent: "create" as "create" | "edit",
	},
	render: function Render({ form, intent }) {
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
						<Icon icon={intent === "create" ? "bx:plus" : "bx:edit"} />
						{intent === "create" ? "Create Bucket" : "Edit Bucket"}
					</form.Button>
				</form.AppForm>
			</form>
		);
	},
});
