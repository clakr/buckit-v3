import { StateTemplate } from "@/components/states-template";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { withForm } from "@/hooks/form";
import { splitAllocationTypeEnum } from "@/lib/schemas";
import { cn, formatCurrency, formatPercentage } from "@/lib/utils";
import { bucketsQueryOption } from "@/modules/buckets/query-options";
import { goalsQueryOption } from "@/modules/goals/query-options";
import TargetSelect from "@/modules/splits/components/target-select";
import {
	createEmptyAllocation,
	type createSplitFormSchema,
	type updateSplitFormSchema,
} from "@/modules/splits/schemas";
import { Icon } from "@iconify/react";
import { formOptions, useStore } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import type z from "zod";

export const splitFormOptions = formOptions({
	defaultValues: {
		id: crypto.randomUUID(),
		name: "",
		description: "",
		base_amount: 0,
		allocations: [],
	} as z.input<typeof createSplitFormSchema | typeof updateSplitFormSchema>,
});

export const SplitForm = withForm({
	...splitFormOptions,
	props: {
		intent: "create" as "create" | "update",
	},
	render: ({ form, intent }) => {
		/**
		 * data
		 */
		const { data: buckets } = useSuspenseQuery(bucketsQueryOption);
		const { data: goals } = useSuspenseQuery(goalsQueryOption);

		/**
		 * form states
		 */
		const allocations = useStore(
			form.store,
			(state) => state.values.allocations,
		);

		/**
		 * actions
		 */
		function handleAddSplit() {
			form.pushFieldValue(
				"allocations",
				createEmptyAllocation({
					split_id: form.state.values.id,
				}),
			);
		}

		function handleDeleteSplit(index: number) {
			if (allocations.length === 1) return;

			form.removeFieldValue("allocations", index);
		}

		/**
		 * listeners
		 */
		function handleTargetIdChange({ value, i }: { value: string; i: number }) {
			const isIncludedInGoals = goals.some(
				(allocation) => allocation.id === value,
			);

			form.setFieldValue(
				`allocations[${i}].target_type`,
				isIncludedInGoals ? "goal" : "bucket",
			);
		}

		function handleAllocationTypeChange({
			value,
			i,
		}: { value: z.infer<typeof splitAllocationTypeEnum>; i: number }) {
			if (value === "fixed") {
				form.setFieldValue(`allocations[${i}].percentage`, null);
				form.setFieldValue(`allocations[${i}].amount`, 0);
				return;
			}

			form.setFieldValue(`allocations[${i}].percentage`, 0);
			form.setFieldValue(`allocations[${i}].amount`, null);
			return;
		}

		/**
		 * derived
		 */
		const allocationsSummary = allocations.map((allocation) => {
			let name = "";
			let type = "";
			let amount = 0;

			if (allocation.target_type === "bucket") {
				name =
					buckets.find((bucket) => bucket.id === allocation.target_id)?.name ||
					"";
			} else {
				name =
					goals.find((goal) => goal.id === allocation.target_id)?.name || "";
			}

			type =
				allocation.allocation_type === "fixed"
					? "Fixed Amount"
					: `${formatPercentage(allocation.percentage || 0)} of ${formatCurrency(form.state.values.base_amount)}`;

			amount =
				allocation.allocation_type === "fixed"
					? +(allocation.amount || 0)
					: (form.state.values.base_amount * (allocation.percentage || 0)) /
						100;

			return {
				name,
				type,
				amount,
			};
		});

		const totalAccumulatedAmount = allocationsSummary.reduce(
			(sum, allocation) => sum + allocation.amount,
			0,
		);

		const remainingAmount =
			form.state.values.base_amount - totalAccumulatedAmount;

		return (
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
						<TabsTrigger value="summary" disabled={allocations.length <= 0}>
							Summary
						</TabsTrigger>
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
														onChange: ({ value }) =>
															handleAllocationTypeChange({ value, i }),
													}}
												>
													{(subField) => (
														<subField.Select
															label="Type"
															id="type"
															options={splitAllocationTypeEnum.options}
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
														) : null
													}
												</form.Subscribe>
												<form.Subscribe
													selector={(state) =>
														state.values.allocations[i].allocation_type
													}
												>
													{(allocationType) =>
														allocationType === "percentage" ? (
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
														) : null
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
									<form.Subscribe
										selector={(state) =>
											state.fieldMeta.allocations?.errors.at(0)
										}
									>
										{(error) =>
											error ? (
												<Alert variant="destructive">
													<Icon icon="bx:info-circle" />
													<AlertTitle>Whoops!</AlertTitle>
													<AlertDescription>
														{error.message || "There was an error"}
													</AlertDescription>
												</Alert>
											) : null
										}
									</form.Subscribe>
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
					<TabsContent value="summary">
						<div className="mx-auto w-full max-w-2xl flex flex-col gap-y-4">
							<ul className="grid gap-y-2">
								{allocationsSummary.map((allocation, i) => (
									<li
										key={i}
										className="bg-secondary p-4 rounded-md grid grid-cols-subgrid col-span-2"
									>
										<div className="flex flex-col">
											<b>{allocation.name}</b>
											<span className="text-muted-foreground text-sm">
												{allocation.type}
											</span>
										</div>
										<b className="text-end self-center">
											{formatCurrency(allocation.amount)}
										</b>
									</li>
								))}
							</ul>
							<Separator />
							<div className="flex flex-col gap-y-2">
								<section className="flex justify-between items-center bg-secondary p-4 rounded-md">
									<div className="flex flex-col">
										<b>Total Accumulated Amount</b>
										<span className="text-sm text-muted-foreground">
											Sum of all {allocationsSummary.length} allocations
										</span>
									</div>
									<b className="text-2xl">
										{formatCurrency(totalAccumulatedAmount)}
									</b>
								</section>

								<section className="flex items-center justify-between bg-secondary p-4 rounded-md">
									<b>Remaining Amount</b>
									<b className={cn(remainingAmount < 0 && "text-red-600")}>
										{formatCurrency(remainingAmount)}
									</b>
								</section>
							</div>
						</div>
					</TabsContent>
				</Tabs>
				<form.AppForm>
					<form.Button className="self-end">
						{intent === "create" ? (
							<>
								<Icon icon="bx:plus" />
								Create Split
							</>
						) : (
							<>
								<Icon icon="bx:edit" />
								Update Split
							</>
						)}
					</form.Button>
				</form.AppForm>
			</form>
		);
	},
});
