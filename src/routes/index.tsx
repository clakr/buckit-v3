import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@iconify/react";
import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<main className="grid place-items-center min-h-svh lg:grid-cols-2">
			<section className="w-[calc(100svw-4rem)] max-w-sm flex flex-col gap-y-6">
				<div className="text-center">
					<h1 className="font-bold text-2xl">Login to your account</h1>
					<span className="text-muted-foreground text-sm">
						Enter your email below to login to your account
					</span>
				</div>
				<form className="flex flex-col gap-y-4">
					<div className="flex flex-col gap-y-2">
						<Label htmlFor="email">Email</Label>
						<Input type="email" name="email" id="email" />
					</div>
					<div className="flex flex-wrap justify-between gap-2">
						<Label htmlFor="password">Password</Label>
						<Button variant="link" className="p-0 h-[unset]" asChild>
							<Link to="/">Forgot your password?</Link>
						</Button>
						<Input
							type="password"
							name="password"
							id="password"
							className="basis-full"
						/>
					</div>
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
						<Link to="/">Sign up</Link>
					</Button>
				</span>
			</section>
			<section className="size-full hidden lg:block">
				<img
					src="https://picsum.photos/2000"
					alt=""
					className="size-full object-center object-cover"
				/>
			</section>
		</main>
	);
}
