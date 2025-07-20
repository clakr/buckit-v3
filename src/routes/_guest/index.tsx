import { Button } from "@/components/ui/button";
import { useAppForm } from "@/hooks/form";
import { supabase } from "@/integrations/supabase";
import { getErrorMessage } from "@/integrations/supabase/utils";
import { Template } from "@/modules/authentication/template";
import { Icon } from "@iconify/react";
import {
	Link,
	createFileRoute,
	stripSearchParams,
} from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";

export const Route = createFileRoute("/_guest/")({
	component: RouteComponent,
	validateSearch: z.object({
		redirectTo: z.string().default("/dashboard"),
	}),
	search: {
		middlewares: [stripSearchParams({ redirectTo: "/dashboard" })],
	},
});

const schema = z.object({
	email: z
		.string()
		.min(1, "Email is required")
		.email("Please enter a valid email address")
		.toLowerCase(),

	password: z.string().min(1, "Password is required"),
});

function RouteComponent() {
	const navigate = Route.useNavigate();
	const { redirectTo } = Route.useSearch();

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
			const { error } = await supabase.auth.signInWithPassword({
				email: value.email,
				password: value.password,
			});

			if (error) {
				toast.error(getErrorMessage(error.code));
				return;
			}

			navigate({
				to: redirectTo,
				replace: true,
			});
		},
	});

	return (
		<Template>
			<section className="flex flex-col gap-y-6 w-[clamp(var(--container-xs),calc(100svw-4rem),var(--container-md))]">
				<div className="text-center">
					<h1 className="font-bold text-2xl">Login to your account</h1>
					<span className="text-muted-foreground text-sm">
						Enter your email below to login to your account
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
					<form.AppField name="password">
						{(field) => (
							<div className="relative">
								<field.Input label="Password" id="password" type="password" />
								<Button
									variant="link"
									className="p-0 h-[unset] absolute top-0 right-0 -translate-y-1/5"
									asChild
								>
									<Link to="/forgot-password">Forgot your password?</Link>
								</Button>
							</div>
						)}
					</form.AppField>
					<Button>Login</Button>
				</form>
				<div className="relative after:inset-0 after:absolute after:border-border after:border-t after:top-1/2 text-center text-muted-foreground after:-z-10">
					<span className="px-2 text-sm bg-background">Or continue with</span>
				</div>
				<Button variant="outline">
					<Icon icon="bxl:google" />
					Login with Google
				</Button>
				<span className="text-sm flex gap-x-2 justify-center">
					Don't have an account?
					<Button variant="link" className="underline p-0 h-[unset]" asChild>
						<Link to="/register">Sign up</Link>
					</Button>
				</span>
			</section>
		</Template>
	);
}
