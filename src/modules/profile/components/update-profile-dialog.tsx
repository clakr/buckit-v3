import { StateTemplate } from "@/components/states-template";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useAppForm } from "@/hooks/form";
import { useUpdateProfileMutation } from "@/modules/profile/mutations";
import { profileQueryOption } from "@/modules/profile/query-options";
import { updateProfileFormSchema } from "@/modules/profile/schemas";
import { createDialogStore } from "@/stores/create-dialog-store";
import { useStore } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import type z from "zod";
import { useShallow } from "zustand/react/shallow";

export const useUpdateProfileDialogStore = createDialogStore();

export function UpdateProfileDialog() {
	/**
	 * dialog state
	 */
	const { isOpen, handleToggle } = useUpdateProfileDialogStore(
		useShallow((state) => ({
			isOpen: state.isOpen,
			handleToggle: state.handleToggle,
		})),
	);

	function handleOnOpenChange() {
		form.reset();
		handleToggle();
	}

	/**
	 * fetch profile
	 */
	const {
		isLoading,
		error,
		refetch,
		data: profile,
	} = useQuery(profileQueryOption);

	/**
	 * form
	 */
	const mutation = useUpdateProfileMutation();

	const defaultValues: z.infer<typeof updateProfileFormSchema> = {
		id: "",
		username: "",
		first_name: "",
		last_name: "",
	};

	const form = useAppForm({
		defaultValues,
		validators: {
			onChange: updateProfileFormSchema,
		},
		onSubmit: async ({ value }) => {
			const payload = updateProfileFormSchema.parse(value);

			mutation.mutate(payload);

			form.reset();

			handleToggle();
		},
	});

	function DialogContainer({ children }: PropsWithChildren) {
		return (
			<Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Update Profile</DialogTitle>
						<DialogDescription>{/* todo: add description */}</DialogDescription>
					</DialogHeader>
					{children}
				</DialogContent>
			</Dialog>
		);
	}

	if (isLoading)
		return (
			<DialogContainer>
				<StateTemplate
					state="loading"
					heading="Loading profile..."
					description="Please wait while we load your profile"
				/>
			</DialogContainer>
		);

	if (error)
		return (
			<DialogContainer>
				<StateTemplate
					state="error"
					heading="Failed to load profile"
					description="We encountered an error while loading your profile."
				>
					<div>
						<Button onClick={async () => await refetch()}>Try Again</Button>
					</div>
				</StateTemplate>
			</DialogContainer>
		);

	if (!profile)
		return (
			<DialogContainer>
				<StateTemplate
					state="empty"
					heading="We can't find that profile"
					description="If you think this is a mistake, please contact us"
				/>
			</DialogContainer>
		);

	return (
		<DialogContainer>
			<form
				className="flex flex-col gap-y-4"
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					form.handleSubmit();
				}}
			>
				<form.AppField name="id" defaultValue={profile.id}>
					{(field) => <field.Input label="ID" type="hidden" id="id" />}
				</form.AppField>
				<form.AppField name="username" defaultValue={profile.username}>
					{(field) => (
						<field.Input label="Username" type="text" id="username" />
					)}
				</form.AppField>
				<div className="grid grid-cols-2 gap-x-4">
					<form.AppField name="first_name" defaultValue={profile.first_name}>
						{(field) => (
							<field.Input label="First Name" type="text" id="first-name" />
						)}
					</form.AppField>
					<form.AppField name="last_name" defaultValue={profile.last_name}>
						{(field) => (
							<field.Input label="Last Name" type="text" id="last-name" />
						)}
					</form.AppField>
				</div>

				<form.AppForm>
					<form.Button className="self-end">Update Profile</form.Button>
				</form.AppForm>
			</form>
		</DialogContainer>
	);
}
