import { IconBrandGoogleFilled } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";

import loginImage from "#/assets/login.webp";
import { Button } from "#/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "#/components/ui/field";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/")({ component: RouteComponent });

function RouteComponent() {
  return (
    <main className="grid h-svh grid-cols-2">
      <section className="flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Enter your email below to login to your account
          </p>
        </div>
        <form className="w-full max-w-125 p-6">
          <FieldGroup className="gap-y-6">
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" type="email" placeholder="youremail@example.com" required />
            </Field>
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <a href="#" className="text-sm">
                  Forgot your password?
                </a>
              </div>
              <Input id="password" type="password" placeholder="********" required />
            </Field>
            <Field>
              <Button type="submit">Login</Button>
            </Field>
            <FieldSeparator>Or continue with</FieldSeparator>
            <Field className="gap-y-3">
              <Button variant="outline" type="button">
                <IconBrandGoogleFilled />
                Login with Google
              </Button>
              <FieldDescription className="text-center">
                Don&apos;t have an account? <Link to="/register">Sign Up</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </section>
      <section className="relative isolate">
        <img
          src={loginImage}
          alt=""
          className="absolute inset-2 size-[calc(100%-(--spacing(4)))] rounded-md"
        />
      </section>
    </main>
  );
}
