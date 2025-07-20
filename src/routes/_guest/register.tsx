import { Button } from "@/components/ui/button";
import { useAppForm } from "@/hooks/form";
import { supabase } from "@/integrations/supabase";
import { getErrorMessage } from "@/integrations/supabase/utils";
import { Template } from "@/modules/authentication/template";
import { Icon } from "@iconify/react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";

export const Route = createFileRoute("/_guest/register")({
	component: RouteComponent,
});

const schema = z
	.object({
		firstName: z
			.string()
			.min(1, "First name is required")
			.min(2, "First name must be at least 2 characters")
			.max(50, "First name must be less than 50 characters")
			.regex(
				/^[a-zA-Z\s'-]+$/,
				"First name can only contain letters, spaces, hyphens, and apostrophes",
			),

		lastName: z
			.string()
			.min(1, "Last name is required")
			.min(2, "Last name must be at least 2 characters")
			.max(50, "Last name must be less than 50 characters")
			.regex(
				/^[a-zA-Z\s'-]+$/,
				"Last name can only contain letters, spaces, hyphens, and apostrophes",
			),

		email: z
			.string()
			.min(1, "Email is required")
			.email("Please enter a valid email address")
			.max(254, "Email must be less than 254 characters") // RFC 5321 specification
			.toLowerCase(),

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
	const form = useAppForm({
		defaultValues: {
			firstName: "",
			lastName: "",
			email: "",
			password: "",
			confirmPassword: "",
		} as z.infer<typeof schema>,
		validators: {
			onBlur: schema,
		},
		onSubmit: async ({ value }) => {
			const { error, data } = await supabase.auth.signUp({
				email: value.email,
				password: value.password,
				options: {
					data: {
						first_name: value.firstName,
						last_name: value.lastName,
					},
				},
			})

			if (error) {
				toast.error(getErrorMessage(error.code));
				return
			}

			// todo: redirect

			console.log(data);
		},
	});

	return (
		<Template>
			<section className=" flex flex-col gap-y-6 w-[clamp(var(--container-xs),calc(100svw-4rem),var(--container-md))]">
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
					<div className="grid gap-4 sm:grid-cols-2">
						<form.AppField name="firstName">
							{(field) => <field.Input label="First Name" id="first-name" />}
						</form.AppField>
						<form.AppField name="lastName">
							{(field) => <field.Input label="Last Name" id="last-name" />}
						</form.AppField>
					</div>
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
					<Button>Sign up</Button>
				</form>
				<div className="relative after:inset-0 after:absolute after:border-border after:border-t after:top-1/2 text-center text-muted-foreground after:-z-10">
					<span className="px-2 text-sm bg-background">Or continue with</span>
				</div>
				<Button variant="outline">
					<Icon icon="bxl:google" />
					Sign up with Google
				</Button>
				<span className="text-sm flex gap-x-2 justify-center">
					Already have an account?
					<Button variant="link" className="underline p-0 h-[unset]" asChild>
						<Link to="/">Sign in</Link>
					</Button>
				</span>
			</section>
		</Template>
	)
}
