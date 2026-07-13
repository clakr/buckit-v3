import { IconBrandGoogleFilled } from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Result } from "better-result";
import { toast } from "sonner";
import { z } from "zod";

import registerImage from "#/assets/register.webp";
import { Button } from "#/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldSeparator } from "#/components/ui/field";
import { useAppForm } from "#/integrations/tanstack-form";
import { signUpUser } from "#/modules/authentication/functions";
import { signUpUserSchema } from "#/modules/authentication/schema";

export const Route = createFileRoute("/_guest/register")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = Route.useNavigate();

  const defaultValues: z.infer<typeof signUpUserSchema> = {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onBlur: signUpUserSchema,
    },
    onSubmit: async ({ value }) => {
      const networkResult = await Result.tryPromise(
        {
          try: () => signUpUser({ data: value }),
          catch: (e) => (e instanceof TypeError ? e.message : e),
        },
        {
          retry: {
            times: 5,
            delayMs: 100,
            backoff: "constant",
          },
        },
      );

      if (networkResult.status === "error") {
        toast.error("Oops!", {
          description: String(networkResult.error),
        });

        return;
      }

      const server = Result.deserialize<void, string>(networkResult.value);

      if (server.status === "error") {
        toast.error("Oops!", {
          description: server.error,
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
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Fill in the form below to create your account
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
            <div className="flex gap-x-3">
              <form.AppField name="firstName">
                {(field) => <field.Input label="First Name" placeholder="John" required />}
              </form.AppField>
              <form.AppField name="lastName">
                {(field) => <field.Input label="Last Name" placeholder="Doe" required />}
              </form.AppField>
            </div>

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
            <div className="flex gap-x-3">
              <form.AppField name="password">
                {(field) => (
                  <field.Input label="Password" type="password" placeholder="********" required />
                )}
              </form.AppField>
              <form.AppField name="confirmPassword">
                {(field) => (
                  <field.Input
                    label="Confirm Password"
                    type="password"
                    placeholder="********"
                    required
                  />
                )}
              </form.AppField>
            </div>
            <Field>
              <form.AppForm>
                <form.Button>Create Account</form.Button>
              </form.AppForm>
            </Field>
            <FieldSeparator>Or continue with</FieldSeparator>
            <Field className="gap-y-3">
              <Button variant="outline" type="button" disabled>
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
