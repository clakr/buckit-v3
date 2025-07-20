import { Button } from "@/components/ui/button";
import { useAppForm } from "@/hooks/form";
import { supabase } from "@/integrations/supabase";
import { getErrorMessage } from "@/integrations/supabase/utils";
import { Template as AuthenticationTemplate } from "@/modules/authentication/template";
import { Icon } from "@iconify/react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { type PropsWithChildren, useEffect, useState } from "react";
import { toast } from "sonner";
import z from "zod";

export const Route = createFileRoute("/_guest/reset-password")({
	component: RouteComponent,
});

const schema = z
	.object({
		password: z
			.string()
			.min(1, "Password is required")
			.min(8, "Password must be at least 8 characters")
			.max(128, "Password must be less than 128 characters")
			.regex(/[A-Z]/, "Password must contain at least one uppercase letter")
			.regex(/[a-z]/, "Password must contain at least one lowercase letter")
			.regex(/[0-9]/, "Password must contain at least one number")
			.regex(
				/[^A-Za-z0-9]/,
				"Password must contain at least one special character",
			),

		confirmPassword: z.string().min(1, "Please confirm your password"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ["confirmPassword"],
	});

function RouteComponent() {
	const [state, setState] = useState<"initial" | "error">("initial");
	const navigate = useNavigate();

	// // Handle password recovery event
	// useEffect(() => {
	// 	const {
	// 		data: { subscription },
	// 	} = supabase.auth.onAuthStateChange(async (event, session) => {
	// 		if (event === "PASSWORD_RECOVERY") {
	// 			// Session is valid, user can proceed with password reset
	// 			// The form will handle the actual password update
	// 		} else if (!session) {
	// 			// No valid session/token
	// 			toast.error("Invalid or expired reset link");
	// 			navigate({ to: "/forgot-password", replace: true });
	// 		}
	// 	});

	// 	// Cleanup subscription on unmount
	// 	return () => {
	// 		subscription.unsubscribe();
	// 	};
	// }, [navigate]);

	const form = useAppForm({
		defaultValues: {
			password: "",
			confirmPassword: "",
		} as z.infer<typeof schema>,
		validators: {
			onBlur: schema,
		},
		onSubmit: async ({ value }) => {
			const { error } = await supabase.auth.updateUser({
				password: value.password,
			});

			if (error) {
				setState("error");
				toast.error(getErrorMessage(error.code));
				return;
			}

			toast.success("Password reset successfully!");

			navigate({ to: "/", replace: true });
		},
	});

	if (state === "initial") {
		return (
			<Template>
				<div className="text-center">
					<h1 className="font-bold text-2xl">Reset your password</h1>
					<span className="text-muted-foreground text-sm">
						Enter your new password below
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
					<form.AppField name="password">
						{(field) => (
							<field.Input label="New Password" id="password" type="password" />
						)}
					</form.AppField>
					<form.AppField name="confirmPassword">
						{(field) => (
							<field.Input
								label="Confirm New Password"
								id="confirm-password"
								type="password"
							/>
						)}
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

	function handleReset() {
		form.reset();
		setState("initial");
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
							We couldn't reset your password
						</span>
					</div>
				</div>
				<Button onClick={handleReset}>Try again</Button>
				<div className="text-center text-sm text-muted-foreground">
					<span>Token expired? </span>
					<Button variant="link" className="p-0 h-[unset] underline" asChild>
						<Link to="/forgot-password">Request a new link</Link>
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
