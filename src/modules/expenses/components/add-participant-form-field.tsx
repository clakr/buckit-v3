import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList as UICommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase";
import {
	createEmptyParticipant,
	type participantBaseSchema,
} from "@/modules/expenses/schemas";
import { Icon } from "@iconify/react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
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
				<section className="gap-2 grid grid-cols-[minmax(0,1fr)_auto]">
					<Label className="col-span-full">Email Address</Label>
					<UserEmailCombobox handleAddParticipant={handleAddParticipant} />
				</section>
			) : (
				<ExternalUserEmailFormField
					handleAddParticipant={handleAddParticipant}
				/>
			)}
		</section>
	);
}

export function UserEmailCombobox({ handleAddParticipant }: Props) {
	const [open, setOpen] = useState(false);

	const [value, setValue] = useState("");
	const debouncedValue = useDebounce(value, 500);

	const {
		isLoading,
		error,
		data: users,
	} = useQuery({
		queryKey: ["users", { email: debouncedValue }],
		queryFn: async () => {
			const { error, data } = await supabase.rpc("search_users_by_email", {
				query: debouncedValue,
			});

			if (error) throw error;

			return data;
		},
		enabled: !!debouncedValue,
	});

	function handleOnSelect(payload: { user_id: string; email: string }) {
		handleAddParticipant(
			createEmptyParticipant({
				type: "system",
				user_id: payload.user_id,
				email: payload.email,
			}),
		);

		setOpen(false);
		setValue("");
	}

	function CommandList() {
		return (
			<UICommandList>
				{isLoading && (
					<div className="py-6 grid place-items-center">
						<Icon icon="bx:loader-alt" className="animate-spin" />
					</div>
				)}

				{error && (
					<div className="py-6 text-sm text-center">{error.message}</div>
				)}

				{users ? (
					users.length === 0 ? (
						<CommandEmpty>No user found</CommandEmpty>
					) : (
						<CommandGroup>
							{users.map((user) => (
								<CommandItem
									key={user.user_id}
									onSelect={() =>
										handleOnSelect({ user_id: user.user_id, email: user.email })
									}
								>
									{user.display_name}
								</CommandItem>
							))}
						</CommandGroup>
					)
				) : null}
			</UICommandList>
		);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					// biome-ignore lint/a11y/useSemanticElements:
					role="combobox"
					aria-expanded={open}
					className="justify-between"
				>
					Select user...
					<Icon icon="bxs:chevron-down" className="opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="p-0">
				<Command shouldFilter={false}>
					<CommandInput
						placeholder="Search user..."
						className="h-9"
						value={value}
						onValueChange={setValue}
					/>
					<CommandList />
				</Command>
			</PopoverContent>
		</Popover>
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

		handleAddParticipant(
			createEmptyParticipant({
				type: "external",
				external_name: fields.name.data,
				external_identifier: fields.identifier.data || undefined,
			}),
		);

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
