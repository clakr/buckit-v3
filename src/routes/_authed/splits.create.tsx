import { Container } from "@/components/container";
import { Heading } from "@/components/heading";
import { useAppForm } from "@/hooks/form";
import { bucketsQueryOption } from "@/modules/buckets/query-options";
import { goalsQueryOption } from "@/modules/goals/query-options";
import { SplitForm } from "@/modules/splits/components/split-form";
import { useCreateSplitMutation } from "@/modules/splits/mutations";
import { createSplitFormSchema } from "@/modules/splits/schemas";
import { createFileRoute } from "@tanstack/react-router";
import type z from "zod";

export const Route = createFileRoute("/_authed/splits/create")({
	loader: async ({ context: { queryClient } }) => {
		await Promise.allSettled([
			queryClient.ensureQueryData(goalsQueryOption),
			queryClient.ensureQueryData(bucketsQueryOption),
		]);
	},
	component: RouteComponent,
});

const splitId = crypto.randomUUID();

function RouteComponent() {
	const navigate = Route.useNavigate();

	const mutation = useCreateSplitMutation();

	const defaultValues: z.input<typeof createSplitFormSchema> = {
		id: splitId,
		name: "",
		description: "",
		base_amount: 0,
		allocations: [],
	};

	const form = useAppForm({
		defaultValues,
		validators: {
			onBlur: createSplitFormSchema,
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

			<SplitForm form={form} />
		</Container>
	);
}
