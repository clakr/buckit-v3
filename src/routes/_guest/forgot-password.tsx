import { Button } from "@/components/ui/button";
import { useAppForm } from "@/hooks/form";
import { supabase } from "@/integrations/supabase";
import { getErrorMessage } from "@/integrations/supabase/utils";
import { Template as AuthenticationTemplate } from "@/modules/authentication/template";
import { Icon } from "@iconify/react";
import { useStore } from "@tanstack/react-form";
import { Link, createFileRoute } from "@tanstack/react-router";
import { type PropsWithChildren, useState } from "react";
import { toast } from "sonner";
import z from "zod";

export const Route = createFileRoute("/_guest/forgot-password")({
	component: RouteComponent,
});

const schema = z.object({
	email: z
		.string()
		.min(1, "Email is required")
		.email("Please enter a valid email address")
		.toLowerCase(),
});

function RouteComponent() {
	const [state, setState] = useState<"initial" | "error" | "success">(
		"initial",
	);

	async function handleResetPassword(email: z.infer<typeof schema>["email"]) {
		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${window.location.origin}/reset-password`,
		});

		if (error) {
			setState("error");
			toast.error(getErrorMessage(error.code));
			return { error };
		}

		setState("success");
		return { error: null };
	}

	const form = useAppForm({
		defaultValues: {
			email: "",
		} as z.infer<typeof schema>,
		validators: {
			onBlur: schema,
		},
		onSubmit: async ({ value }) => {
			handleResetPassword(value.email);
		},
	});

	const email = useStore(form.store, (state) => state.values.email);

	function handleReset() {
		form.reset();
		setState("initial");
	}

	async function handleResend() {
		await handleResetPassword(email);
		toast.success("Password reset link sent!");
	}

	if (state === "initial") {
		return (
			<Template>
				<div className="text-center">
					<h1 className="font-bold text-2xl">Forgot your password?</h1>
					<span className="text-muted-foreground text-sm">
						No worries, we'll send you the instructions to reset your password.
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
						{(field) => <field.Input label="Email" id="email" type="email" />}
					</form.AppField>
					<Button>Reset Password</Button>
				</form>
				<Button variant="link" className="p-0 h-[unset]" asChild>
					<Link to="/">
						<Icon icon="bx:left-arrow-alt" />
						Back to login
					</Link>
				</Button>
			</Template>
		);
	}

	if (state === "error") {
		return (
			<Template>
				<div className="text-center flex flex-col items-center gap-y-1">
					<div className="size-12 p-3 rounded-full bg-destructive/10 text-destructive">
						<Icon icon="bx:error-circle" className="size-full" />
					</div>
					<div>
						<h1 className="font-bold text-2xl">Something went wrong</h1>
						<span className="text-muted-foreground text-sm">
							We couldn't send the password reset email
						</span>
					</div>
				</div>
				<Button onClick={handleReset}>Try again</Button>
				<Button variant="link" className="p-0 h-[unset]" asChild>
					<Link to="/">
						<Icon icon="bx:left-arrow-alt" />
						Back to login
					</Link>
				</Button>
			</Template>
		);
	}

	if (state === "success") {
		return (
			<Template>
				<div className="text-center flex flex-col items-center gap-y-1">
					<div className="size-12 p-3 rounded-full bg-primary/10 text-primary">
						<Icon icon="bx:envelope" className="size-full" />
					</div>
					<div>
						<h1 className="font-bold text-2xl">Please check your email</h1>
						<span className="text-muted-foreground text-sm">
							We sent a password reset link to
						</span>
					</div>
					<span className="font-semibold">{email}</span>
				</div>
				<Button asChild>
					<a href={`mailto:${email}`} target="_blank" rel="noreferrer">
						Open email app
					</a>
				</Button>
				<div className="text-center text-sm text-muted-foreground">
					<span>Didn't receive the email? </span>
					<Button
						variant="link"
						className="p-0 h-[unset] underline"
						onClick={handleResend}
					>
						Click to resend
					</Button>
				</div>
				<Button variant="link" className="p-0 h-[unset]" asChild>
					<Link to="/">
						<Icon icon="bx:left-arrow-alt" />
						Back to login
					</Link>
				</Button>
			</Template>
		);
	}
}

function Template({ children }: PropsWithChildren) {
	return (
		<AuthenticationTemplate>
			<section className="flex flex-col gap-y-6 w-[clamp(var(--container-xs),calc(100svw-4rem),var(--container-md))]">
				{children}
			</section>
		</AuthenticationTemplate>
	);
}
