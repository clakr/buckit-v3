import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { withForm } from "@/hooks/form";
import { useAlert } from "@/hooks/use-alert";
import { expenseStatusEnum } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { AddParticipantFormField } from "@/modules/expenses/components/add-participant-form-field";
import type {
	createExpenseFormSchema,
	participantBaseSchema,
} from "@/modules/expenses/schemas";
import { Icon } from "@iconify/react";
import { formOptions, useStore } from "@tanstack/react-form";
import { useState } from "react";
import type z from "zod";

const validExpenseStatusEnum = expenseStatusEnum.exclude(["archived"]);

export const expenseFormOptions = formOptions({
	defaultValues: {
		id: crypto.randomUUID(),
		name: "",
		description: "",
		status: "draft",
		participants: [],
	} as z.input<typeof createExpenseFormSchema>,
});

export const ExpenseForm = withForm({
	...expenseFormOptions,
	props: {
		intent: "create" as "create" | "update",
	},
	render: ({ form, intent }) => {
		const { show } = useAlert();

		const [isAdvanced, setIsAdvanced] = useState(false);

		function handleAddParticipant(
			payload: z.input<typeof participantBaseSchema>,
		) {
			form.pushFieldValue("participants", payload);
		}

		function handleRemoveParticipant(index: number) {
			const participant = participants[index];

			const identifier =
				participant.type === "system"
					? participant.email
					: participant.external_name;

			show({
				title: "Remove this participant?",
				description: `Are you sure you want to remove ${identifier}?`,
				actionText: "Remove Participant",
				onAction: () => {
					form.removeFieldValue("participants", index);
				},
			});
		}

		const participants = useStore(
			form.store,
			(state) => state.values.participants,
		);

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
										enumSchema={validExpenseStatusEnum}
									/>
								)}
							</form.AppField>
						) : null}

						<AddParticipantFormField
							handleAddParticipant={handleAddParticipant}
						/>

						<ParticipantsList
							participants={participants}
							handleRemoveParticipant={handleRemoveParticipant}
						/>
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

type Props = {
	participants: z.output<typeof participantBaseSchema>[];
	handleRemoveParticipant: (index: number) => void;
};

function ParticipantsList({ participants, handleRemoveParticipant }: Props) {
	return participants.length > 0 ? (
		<section className="flex flex-col gap-y-2">
			<Label>Participants ({participants.length})</Label>
			<ul className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] gap-y-2">
				{participants.map((participant, index) => (
					<li
						key={index}
						className="grid grid-cols-subgrid col-span-4 items-center rounded-lg border p-4 text-sm gap-x-4"
					>
						<Icon
							icon={participant.type === "system" ? "bx:user" : "bx:user-plus"}
							className={cn(
								"size-4.5",
								participant.type === "system"
									? "text-primary"
									: "text-secondary-foreground",
							)}
						/>
						<Badge variant="secondary" className="capitalize">
							{participant.type}
						</Badge>
						<div className="flex flex-col">
							<b>
								{participant.type === "system"
									? participant.email
									: participant.external_name}
							</b>
							<span className="text-muted-foreground text-xs">
								{participant.type === "external"
									? participant.external_identifier
									: null}
							</span>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={() => handleRemoveParticipant(index)}
						>
							<Icon icon="bx:trash" />
							<span className="sr-only">remove participant</span>
						</Button>
					</li>
				))}
			</ul>
		</section>
	) : null;
}
