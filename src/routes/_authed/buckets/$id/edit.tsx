import { useAppForm } from "@/hooks/form";
import { supabase } from "@/integrations/supabase";
import { getErrorMessage } from "@/integrations/supabase/utils";
import { bucketQueryOption } from "@/modules/buckets/query-options";
import { editBucketFormSchema } from "@/modules/buckets/schemas";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
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
			const { error } = await supabase
				.from("buckets")
				.update({
					name: value.name,
					description: value.description,
				})
				.eq("id", value.id)
				.select();

			if (error) {
				toast.error(getErrorMessage(error.code));
				return;
			}

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
			<form.AppForm>
				<form.Button className="self-end">
					<Icon icon="bx:minus" />
					Edit Bucket
				</form.Button>
			</form.AppForm>
		</form>
	);
}
