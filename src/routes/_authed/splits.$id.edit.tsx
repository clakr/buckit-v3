import { Container } from "@/components/container";
import { Heading } from "@/components/heading";
import { StateTemplate } from "@/components/states-template";
import { Button } from "@/components/ui/button";
import { useAppForm } from "@/hooks/form";
import { bucketsQueryOption } from "@/modules/buckets/query-options";
import { goalsQueryOption } from "@/modules/goals/query-options";
import { SplitForm, splitFormOptions } from "@/modules/splits/components/split-form";
import {  useUpdateSplitMutation } from "@/modules/splits/mutations";
import { splitQueryOption } from "@/modules/splits/query-options";
import { updateSplitFormSchema } from "@/modules/splits/schemas";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	type ErrorComponentProps,
	createFileRoute,
} from "@tanstack/react-router";
import type z from "zod";

export const Route = createFileRoute("/_authed/splits/$id/edit")({
	loader: async ({ context: { queryClient }, params: { id } }) => {
		await Promise.allSettled([
			queryClient.ensureQueryData(splitQueryOption(id)),
			queryClient.ensureQueryData(goalsQueryOption),
			queryClient.ensureQueryData(bucketsQueryOption),
		]);
	},
	pendingComponent: PendingComponent,
	errorComponent: ErrorComponent,
	component: RouteComponent,
});

function PendingComponent() {
	return (
		<Container>
			<Heading heading="Split" />
			<StateTemplate
				state="loading"
				heading="Loading split..."
				description="Please wait while we load your split"
			/>
		</Container>
	);
}

function ErrorComponent({ reset }: ErrorComponentProps) {
	return (
		<Container>
			<Heading heading="Split" />
			<StateTemplate
				state="error"
				heading="Failed to load split"
				description="We encountered an error while loading your split."
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
	const { data: split } = useSuspenseQuery(splitQueryOption(id));

	if (!split)
		return (
			<Container>
				<StateTemplate
					state="empty"
					heading="We can't find that split"
					description="If you think this is a mistake, please contact us"
				/>
			</Container>
		);

	/**
	 * form
	 */
	const navigate = Route.useNavigate();

	const mutation = useUpdateSplitMutation();

	const defaultValues: z.input<typeof updateSplitFormSchema> = {
		id: split.id,
		name: split.name,
		description: split.description,
		base_amount: split.base_amount,
		allocations: split.split_allocations,
	};

	const form = useAppForm({
		...splitFormOptions,
		defaultValues,
		validators: {
			onBlur: updateSplitFormSchema,
		},
		onSubmit: async ({ value }) => {
			const payload = updateSplitFormSchema.parse(value);

			mutation.mutate(payload);

			form.reset();

			navigate({
				to: "/splits",
			});
		},
	});

	return (
		<Container>
			<Heading heading={split.name} />

			<SplitForm form={form} intent="update" />
		</Container>
	);
}
