import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { withForm } from "@/hooks/form";
import { expenseStatusEnum } from "@/lib/schemas";
import type { createExpenseFormSchema } from "@/modules/expenses/schemas";
import { Icon } from "@iconify/react";
import { formOptions } from "@tanstack/react-form";
import { useState } from "react";
import type z from "zod";

export const expenseFormOptions = formOptions({
	defaultValues: {
		id: crypto.randomUUID(),
		name: "",
		description: "",
		status: "draft",
	} as z.input<typeof createExpenseFormSchema>,
});

export const ExpenseForm = withForm({
	...expenseFormOptions,
	props: {
		intent: "create" as "create" | "update",
	},
	render: ({ form, intent }) => {
		const [isAdvanced, setIsAdvanced] = useState(false);

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
					<section className="flex items-center justify-between">
						<TabsList>
							<TabsTrigger value="details">Details</TabsTrigger>
							<TabsTrigger value="items">Items</TabsTrigger>
						</TabsList>

						<div className="flex items-center space-x-2">
							<Switch
								id="toggle-advanced"
								checked={isAdvanced}
								onCheckedChange={setIsAdvanced}
							/>
							<Label htmlFor="toggle-advanced" className="text-xs">
								Toggle Advanced Fields
							</Label>
						</div>
					</section>

					<TabsContent value="details" className="flex flex-col gap-y-4">
						<form.AppField name="name">
							{(field) => <field.Input label="Name" id="name" type="text" />}
						</form.AppField>
						<form.AppField name="description">
							{(field) => (
								<field.Textarea label="Description" id="description" />
							)}
						</form.AppField>
						{isAdvanced ? (
							<form.AppField name="status">
								{(field) => (
									<field.Select
										label="Status"
										id="status"
										enumSchema={expenseStatusEnum}
									/>
								)}
							</form.AppField>
						) : null}
					</TabsContent>
					<TabsContent value="items">items</TabsContent>
				</Tabs>
				<form.AppForm>
					<form.Button className="self-end">
						{intent === "create" ? (
							<>
								<Icon icon="bx:plus" />
								Create Expense
							</>
						) : (
							<>
								<Icon icon="bx:edit" />
								Update Expense
							</>
						)}
					</form.Button>
				</form.AppForm>
			</form>
		);
	},
});
