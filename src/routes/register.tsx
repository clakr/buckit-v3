import { IconBrandGoogleFilled } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";

import registerImage from "#/assets/register.webp";
import { Button } from "#/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "#/components/ui/field";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/register")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className="grid h-svh grid-cols-2">
      <section className="flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Fill in the form below to create your account
          </p>
        </div>
        <form className="w-full max-w-125 p-6">
          <FieldGroup className="gap-y-6">
            <div className="flex gap-x-3">
              <Field>
                <FieldLabel htmlFor="first-name">First Name</FieldLabel>
                <Input id="first-name" type="text" placeholder="John" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="last-name">Last Name</FieldLabel>
                <Input id="last-name" type="text" placeholder="Doe" required />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" type="email" placeholder="youremail@example.com" required />
            </Field>
            <div className="flex gap-x-3">
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input id="password" type="password" placeholder="********" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                <Input id="confirm-password" type="password" placeholder="********" required />
              </Field>
            </div>
            <Field>
              <Button type="submit">Create Account</Button>
            </Field>
            <FieldSeparator>Or continue with</FieldSeparator>
            <Field className="gap-y-3">
              <Button variant="outline" type="button">
                <IconBrandGoogleFilled />
                Sign up with Google
              </Button>
              <FieldDescription className="px-6 text-center">
                Already have an account? <Link to="/">Sign In</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </section>
      <section className="relative isolate">
        <img
          src={registerImage}
          alt=""
          className="absolute inset-2 size-[calc(100%-(--spacing(4)))] rounded-md"
        />
      </section>
    </main>
  );
}
