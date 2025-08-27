import { Container } from "@/components/container";
import { Heading } from "@/components/heading";
import { useAppForm } from "@/hooks/form";
import { bucketsQueryOption } from "@/modules/buckets/query-options";
import { goalsQueryOption } from "@/modules/goals/query-options";
import {
	SplitForm,
	splitFormOptions,
} from "@/modules/splits/components/split-form";
import { useCreateSplitMutation } from "@/modules/splits/mutations";
import { createSplitFormSchema } from "@/modules/splits/schemas";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/splits/create")({
	loader: async ({ context: { queryClient } }) => {
		await Promise.allSettled([
			queryClient.ensureQueryData(goalsQueryOption),
			queryClient.ensureQueryData(bucketsQueryOption),
		]);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = Route.useNavigate();

	const mutation = useCreateSplitMutation();

	const form = useAppForm({
		...splitFormOptions,
		validators: {
			onChange: createSplitFormSchema,
		},
		onSubmit: async ({ value }) => {
			const payload = createSplitFormSchema.parse(value);

			mutation.mutate(payload);

			form.reset();

			navigate({
				to: "/splits",
			});
		},
	});

	return (
		<Container>
			<Heading heading="Create Split" />
			<SplitForm form={form} intent="create" />
		</Container>
	);
}
