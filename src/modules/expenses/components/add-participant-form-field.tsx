import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { participantBaseSchema } from "@/modules/expenses/schemas";
import { Icon } from "@iconify/react";
import { useRef, useState } from "react";
import z from "zod";

type Participant = "system" | "external";

type Props = {
	handleAddParticipant: (
		payload: z.infer<typeof participantBaseSchema>,
	) => void;
};

export function AddParticipantFormField({ handleAddParticipant }: Props) {
	const [type, setType] = useState<Participant>("system");

	return (
		<section className="flex-col flex gap-y-4">
			<Label>Add Participants</Label>
			<RadioGroup
				orientation="horizontal"
				defaultValue={type}
				onValueChange={(value) => setType(value as Participant)}
			>
				<div className="flex items-center gap-2">
					<RadioGroupItem value="system" id="system" />
					<Label htmlFor="system">System User</Label>
				</div>
				<div className="flex items-center gap-2">
					<RadioGroupItem value="external" id="external" />
					<Label htmlFor="external">External User</Label>
				</div>
			</RadioGroup>

			{type === "system" ? (
				<SystemUserEmailFormField handleAddParticipant={handleAddParticipant} />
			) : (
				<ExternalUserEmailFormField
					handleAddParticipant={handleAddParticipant}
				/>
			)}
		</section>
	);
}

function SystemUserEmailFormField({ handleAddParticipant }: Props) {
	const inputRef = useRef<HTMLInputElement>(null);

	const [field, setField] = useState<
		| { state: "initial" }
		| { state: "error"; error: string }
		| { state: "success"; data: string }
	>({ state: "initial" });

	function handleOnChange(event: React.ChangeEvent<HTMLInputElement>) {
		setField({ state: "initial" });

		const value = event.target.value;

		const { success, error, data } = z
			.string()
			.email("Please enter a valid email address")
			.trim()
			.safeParse(value);

		setField(() => {
			if (!success && error)
				return {
					state: "error",
					error: error.issues.at(0)?.message || "Unknown error happened",
				};

			return {
				state: "success",
				data,
			};
		});
	}

	function handleOnClick() {
		if (field.state !== "success") return;

		handleAddParticipant({
			type: "system",
			email: field.data,
		});

		setField({ state: "initial" });

		if (inputRef.current) {
			inputRef.current.value = "";
			inputRef.current.focus();
		}
	}

	return (
		<section className="gap-2 grid grid-cols-[minmax(0,1fr)_auto]">
			<Label htmlFor="system-user-email" className="col-span-full">
				Email Address
			</Label>
			<Input
				ref={inputRef}
				type="email"
				id="system-user-email"
				placeholder="Enter email address"
				onChange={handleOnChange}
			/>
			<Button
				type="button"
				variant="secondary"
				size="icon"
				disabled={field.state !== "success"}
				onClick={handleOnClick}
			>
				<Icon icon="bx:plus" />
			</Button>
			{field.state === "error" ? (
				<span className="text-destructive col-span-full text-xs">
					{field.error}
				</span>
			) : null}
		</section>
	);
}

function ExternalUserEmailFormField({ handleAddParticipant }: Props) {
	const nameInputRef = useRef<HTMLInputElement>(null);
	const identifierInputRef = useRef<HTMLInputElement>(null);

	const [fields, setFields] = useState<{
		name:
			| {
					state: "initial";
			  }
			| {
					state: "error";
					error: string;
			  }
			| {
					state: "success";
					data: string;
			  };
		identifier:
			| {
					state: "initial";
			  }
			| {
					state: "error";
					error: string;
			  }
			| {
					state: "success";
					data: string;
			  };
	}>({
		name: { state: "initial" },
		identifier: { state: "success", data: "" },
	});

	const fieldSchemaMapping = {
		name: z
			.string()
			.min(1, "Name is required")
			.min(2, "Name must be at least 2 characters")
			.max(50, "Name must be less than 50 characters")
			.regex(
				/^[a-zA-Z\s'-]+$/,
				"Name can only contain letters, spaces, hyphens, and apostrophes",
			)
			.trim(),
		identifier: z.string().trim(),
	};

	function handleOnChange(event: React.ChangeEvent<HTMLInputElement>) {
		const { name, value } = event.target;

		const schema = fieldSchemaMapping[name as keyof typeof fieldSchemaMapping];

		const { success, error, data } = schema.safeParse(value);

		setFields((prev) => {
			if (!success && error)
				return {
					...prev,
					[name]: {
						state: "error",
						error: error.issues.at(0)?.message || "Unknown error happened",
					},
				};

			return {
				...prev,
				[name]: {
					state: "success",
					data,
				},
			};
		});
	}

	const isButtonDisabled = Object.values(fields).some(
		(field) => field.state === "initial" || field.state === "error",
	);

	function handleOnClick() {
		if (
			fields.name.state !== "success" ||
			fields.identifier.state !== "success"
		)
			return;

		handleAddParticipant({
			type: "external",
			external_name: fields.name.data,
			external_identifier: fields.identifier.data || undefined,
		});

		setFields({ name: { state: "initial" }, identifier: { state: "initial" } });

		if (nameInputRef.current) {
			nameInputRef.current.value = "";
			nameInputRef.current.focus();
		}

		if (identifierInputRef.current) {
			identifierInputRef.current.value = "";
		}
	}

	return (
		<section className="grid grid-cols-[minmax(0,1fr)_auto] gap-y-4 gap-x-2">
			<div className="flex flex-col gap-y-2">
				<Label htmlFor="external-user-name">Name *</Label>
				<Input
					ref={nameInputRef}
					type="text"
					id="external-user-name"
					name="name"
					placeholder="Enter name"
					onChange={handleOnChange}
				/>
				{fields.name.state === "error" ? (
					<span className="text-destructive text-xs">{fields.name.error}</span>
				) : null}
			</div>
			<div className="flex flex-col gap-y-2 row-start-2">
				<Label htmlFor="external-user-identifier">Identifier</Label>
				<Input
					ref={identifierInputRef}
					type="text"
					id="external-user-identifier"
					name="identifier"
					placeholder="Enter identifier"
					onChange={handleOnChange}
				/>

				{fields.identifier.state === "error" ? (
					<span className="text-destructive text-xs">
						{fields.identifier.error}
					</span>
				) : null}
			</div>
			<Button
				type="button"
				variant="secondary"
				size="icon"
				className="self-end row-start-2"
				disabled={isButtonDisabled}
				onClick={handleOnClick}
			>
				<Icon icon="bx:plus" />
			</Button>
		</section>
	);
}
