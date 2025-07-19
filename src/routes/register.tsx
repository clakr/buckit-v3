import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Template } from "@/modules/authentication/template";
import { Icon } from "@iconify/react";
import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/register")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<Template>
			<section className="w-[calc(100svw-4rem)] max-w-md flex flex-col gap-y-6">
				<div className="text-center">
					<h1 className="font-bold text-2xl">Create an account</h1>
					<span className="text-muted-foreground text-sm">
						Enter your information below to create your account
					</span>
				</div>
				<form className="flex flex-col gap-y-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="flex flex-col gap-y-2">
							<Label htmlFor="first-name">First Name</Label>
							<Input type="text" name="first-name" id="first-name" />
						</div>
						<div className="flex flex-col gap-y-2">
							<Label htmlFor="last-name">Last Name</Label>
							<Input type="text" name="last-name" id="last-name" />
						</div>
					</div>
					<div className="flex flex-col gap-y-2">
						<Label htmlFor="email">Email</Label>
						<Input type="email" name="email" id="email" />
					</div>
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="flex flex-col gap-y-2">
							<Label htmlFor="password">Password</Label>
							<Input type="password" name="password" id="password" />
						</div>
						<div className="flex flex-col gap-y-2">
							<Label htmlFor="confirm-password">Confirm Password</Label>
							<Input
								type="password"
								name="confirm-password"
								id="confirm-password"
							/>
						</div>
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
	);
}
