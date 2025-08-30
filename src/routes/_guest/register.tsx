// ~/routes/_guest/register.tsx

import { Button } from "@/components/ui/button";
import { useAppForm } from "@/hooks/form";
import { supabase } from "@/integrations/supabase";
import { getErrorMessage } from "@/integrations/supabase/utils";
import { PasswordRequirements } from "@/modules/authentication/components/password-requirement";
import { registerUserSchema } from "@/modules/authentication/schemas";
import { Template } from "@/modules/authentication/template";
import { useStore } from "@tanstack/react-form";
import { Link, createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import type z from "zod";

export const Route = createFileRoute("/_guest/register")({
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = Route.useNavigate();

	const defaultValues: z.input<typeof registerUserSchema> = {
		email: "",
		password: "",
		confirmPassword: "",
	};

	const form = useAppForm({
		defaultValues,
		validators: {
			onChange: registerUserSchema,
		},
		onSubmit: async ({ value }) => {
			const { error } = await supabase.auth.signUp({
				email: value.email,
				password: value.password,
			});

			if (error) {
				toast.error(getErrorMessage(error.code));
				return;
			}

			navigate({
				to: "/dashboard",
				replace: true,
			});
		},
	});

	const password = useStore(form.store, (state) => state.values.password);

	return (
		<Template>
			<section className=" flex flex-col gap-y-6 w-[clamp(var(--container-xs),calc(100svw-4rem),var(--container-lg))]">
				<div className="text-center">
					<h1 className="font-bold text-2xl">Create an account</h1>
					<span className="text-muted-foreground text-sm">
						Enter your information below to create your account
					</span>
				</div>
				<form
					className="flex flex-col gap-y-4"
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						form.handleSubmit();
					}}
				>
					<form.AppField name="email">
						{(field) => <field.Input label="Email" type="email" id="email" />}
					</form.AppField>
					<div className="grid gap-4 sm:grid-cols-2">
						<form.AppField name="password">
							{(field) => (
								<field.Input label="Password" type="password" id="password" />
							)}
						</form.AppField>
						<form.AppField name="confirmPassword">
							{(field) => (
								<field.Input
									label="Confirm Password"
									type="password"
									id="confirm-password"
								/>
							)}
						</form.AppField>
					</div>
					<PasswordRequirements password={password} />
					<form.AppForm>
						<form.Button>Sign up</form.Button>
					</form.AppForm>
				</form>
				{/* <div className="relative after:inset-0 after:absolute after:border-border after:border-t after:top-1/2 text-center text-muted-foreground after:-z-10">
					<span className="px-2 text-sm bg-background">Or continue with</span>
				</div>
				<Button variant="outline">
					<Icon icon="bxl:google" />
					Sign up with Google
				</Button> */}
				<span className="text-sm flex gap-x-2 justify-center">
					Already have an account?
					<Button variant="link" className="underline p-0 h-[unset]" asChild>
						<Link to="/">Sign in</Link>
					</Button>
				</span>
			</section>
		</Template>
	);
}
