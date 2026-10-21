import { z } from "zod";

// Only same-origin paths. A leading `//` or `/\` would send the User to another site.
export const signInSearchSchema = z.object({
  redirect: z
    .string()
    .regex(/^\/(?![/\\])/)
    .optional()
    .catch(undefined),
});

export const signInUserSchema = z.object({
  email: z.email("Please enter a valid email address").toLowerCase().trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
});

export const signUpUserSchema = signInUserSchema
  .extend({
    firstName: z
      .string()
      .trim()
      .min(1, "First name is required")
      .max(50, "First name must be at most 50 characters"),
    lastName: z
      .string()
      .trim()
      .min(1, "Last name is required")
      .max(50, "Last name must be at most 50 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
