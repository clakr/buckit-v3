import { Container } from "@/components/container";
import { Heading } from "@/components/heading";
import { useAppForm } from "@/hooks/form";
import { useUpdateBucket } from "@/modules/buckets/mutations";
import { bucketQueryOption } from "@/modules/buckets/query-options";
import { editBucketFormSchema } from "@/modules/buckets/schemas";
import { Icon } from "@iconify/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type z from "zod";

export const Route = createFileRoute("/_authed/buckets/$id/edit")({
	component: RouteComponent,
	loader: async ({ context: { queryClient }, params: { id } }) => {
		await queryClient.ensureQueryData(bucketQueryOption(id));
	},
});

function RouteComponent() {
	const { id } = Route.useParams();
	const navigate = Route.useNavigate();

	const { data: bucket } = useSuspenseQuery(bucketQueryOption(id));

	const mutation = useUpdateBucket();

	const defaultValues: z.input<typeof editBucketFormSchema> = {
		id: bucket?.id || "",
		name: bucket?.name || "",
		description: bucket?.description || "",
	};

	const form = useAppForm({
		defaultValues,
		validators: {
			onBlur: editBucketFormSchema,
		},
		onSubmit: async ({ value }) => {
			const payload = editBucketFormSchema.parse(value);

			mutation.mutate(payload);

			navigate({ to: "/buckets" });
		},
	});

	return (
		<Container>
			<Heading heading="Edit Bucket" />
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
				<form.AppForm>
					<form.Button className="self-end">
						<Icon icon="bx:edit" />
						Edit Bucket
					</form.Button>
				</form.AppForm>
			</form>
		</Container>
	);
}
