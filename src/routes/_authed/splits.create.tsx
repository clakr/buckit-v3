import { Container } from "@/components/container";
import { Heading } from "@/components/heading";
import { StateTemplate } from "@/components/states-template";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppForm } from "@/hooks/form";
import { bucketsQueryOption } from "@/modules/buckets/query-options";
import { goalsQueryOption } from "@/modules/goals/query-options";
import TargetSelect from "@/modules/splits/components/target-select";
import { useCreateSplitMutation } from "@/modules/splits/mutations";
import {
	allocationTypeEnum,
	createEmptyAllocation,
	createSplitFormSchema,
} from "@/modules/splits/schemas";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useStore } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type z from "zod";

export const Route = createFileRoute("/_authed/splits/create")({
	loader: async ({ context: { queryClient } }) => {
		await queryClient.ensureQueryData(goalsQueryOption);
		await queryClient.ensureQueryData(bucketsQueryOption);
	},
	component: RouteComponent,
});

const splitId = crypto.randomUUID();

function RouteComponent() {
	const navigate = Route.useNavigate();

	const { data: goals } = useSuspenseQuery(goalsQueryOption);

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

	const allocations = useStore(form.store, (state) => state.values.allocations);

	function handleAddSplit() {
		form.pushFieldValue("allocations", createEmptyAllocation(splitId));
	}

	function handleDeleteSplit(index: number) {
		if (allocations.length === 1) return;

		form.removeFieldValue("allocations", index);
	}

	function handleTargetIdChange({ value, i }: { value: string; i: number }) {
		const isIncluded = goals.some((allocation) => allocation.id === value);
		if (!isIncluded) return;

		form.setFieldValue(`allocations[${i}].target_type`, "goal");
	}

	function handleAllocationTypeChange(index: number) {
		form.setFieldValue(`allocations[${index}].percentage`, null);
		form.setFieldValue(`allocations[${index}].amount`, null);
	}

	return (
		<Container>
			<Heading heading="Create Split" />

			<form
				className="flex flex-col gap-y-4"
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					form.handleSubmit();
				}}
			>
				<Tabs defaultValue="details">
					<TabsList>
						<TabsTrigger value="details">Details</TabsTrigger>
						<TabsTrigger value="allocations">Allocations</TabsTrigger>
					</TabsList>
					<TabsContent value="details" className="flex flex-col gap-y-4">
						<form.AppField name="name">
							{(field) => <field.Input label="Name" id="name" type="text" />}
						</form.AppField>
						<form.AppField name="description">
							{(field) => (
								<field.Textarea label="Description" id="description" />
							)}
						</form.AppField>
						<form.AppField name="base_amount">
							{(field) => (
								<field.Input
									label="Base Amount"
									id="base-amount"
									type="number"
								/>
							)}
						</form.AppField>
					</TabsContent>
					<TabsContent value="allocations" className="flex flex-col gap-y-4">
						<form.AppField name="allocations" mode="array">
							{() => (
								<>
									{allocations.length > 0 ? (
										allocations.map((_, i) => (
											<article
												key={i}
												className="grid grid-cols-4 gap-x-4 p-6 rounded-md border-dotted border-2"
											>
												<form.AppField
													name={`allocations[${i}].target_id`}
													listeners={{
														onChange: ({ value }) =>
															handleTargetIdChange({ value, i }),
													}}
												>
													{() => <TargetSelect />}
												</form.AppField>
												<form.AppField
													name={`allocations[${i}].allocation_type`}
													listeners={{
														onChange: () => handleAllocationTypeChange(i),
													}}
												>
													{(subField) => (
														<subField.Select
															label="Type"
															id="type"
															enumSchema={allocationTypeEnum}
														/>
													)}
												</form.AppField>
												<form.Subscribe
													selector={(state) =>
														state.values.allocations[i].allocation_type
													}
												>
													{(allocationType) =>
														allocationType === "fixed" ? (
															<form.AppField name={`allocations[${i}].amount`}>
																{(subField) => (
																	<subField.Input
																		label="Amount"
																		id="amount"
																		type="number"
																	/>
																)}
															</form.AppField>
														) : (
															<form.AppField
																name={`allocations[${i}].percentage`}
															>
																{(subField) => (
																	<subField.Input
																		label="Percentage"
																		id="percentage"
																		type="number"
																	/>
																)}
															</form.AppField>
														)
													}
												</form.Subscribe>
												<Button
													type="button"
													variant="outline"
													size="icon"
													className="self-end"
													disabled={allocations.length === 1}
													onClick={() => handleDeleteSplit(i)}
												>
													<Icon icon="bx:trash" />
													<span className="sr-only">Delete Split</span>
												</Button>
											</article>
										))
									) : (
										<StateTemplate
											state="empty"
											heading="No Allocations"
											description="Add an allocation to get started."
										/>
									)}
									<Button
										variant="secondary"
										type="button"
										className="self-start"
										onClick={handleAddSplit}
									>
										<Icon icon="bx:plus" />
										Add Split
									</Button>
								</>
							)}
						</form.AppField>
					</TabsContent>
				</Tabs>
				<form.AppForm>
					<form.Button className="self-end">
						<Icon icon="bx:plus" />
						Create Split
					</form.Button>
				</form.AppForm>
			</form>
		</Container>
	);
}
