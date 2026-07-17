import { IconBrandGoogleFilled } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

import loginImage from "#/assets/login.webp";
import { Button } from "#/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldSeparator } from "#/components/ui/field";
import { useAppForm } from "#/integrations/tanstack-form";
import { signInUser } from "#/modules/authentication/functions";
import { signInUserSchema } from "#/modules/authentication/schema";

export const Route = createFileRoute("/_guest/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = Route.useNavigate();

  const defaultValues: z.infer<typeof signInUserSchema> = {
    email: "",
    password: "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onBlur: signInUserSchema,
    },
    onSubmit: async ({ value: data }) => {
      try {
        await signInUser({ data });
      } catch (error) {
        toast.error("Oops", {
          description: error instanceof Error ? error.message : String(error),
        });

        return;
      }

      navigate({
        to: "/dashboard",
        replace: true,
      });
    },
  });

  return (
    <main className="grid h-svh grid-cols-2">
      <section className="flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Enter your email below to login to your account
          </p>
        </div>
        <form
          className="w-full max-w-125 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <FieldGroup className="gap-y-6">
            <form.AppField name="email">
              {(field) => (
                <field.Input
                  label="Email"
                  type="email"
                  placeholder="johndoe@example.com"
                  required
                />
              )}
            </form.AppField>
            <form.AppField name="password">
              {(field) => (
                <field.Input label="Password" type="password" placeholder="********" required />
              )}
            </form.AppField>
            <Field>
              <form.AppForm>
                <form.Button>Login</form.Button>
              </form.AppForm>
            </Field>
            <FieldSeparator>Or continue with</FieldSeparator>
            <Field className="gap-y-3">
              <Button variant="outline" type="button" disabled>
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
