import z from "zod";

export const registerUserSchema = z
	.object({
		email: z
			.email("Please enter a valid email address")
			.min(1, "Email is required")
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

export const loginUserSchema = z.object({
	email: z
		.email("Please enter a valid email address")
		.min(1, "Email is required")
		.toLowerCase(),

	password: z.string().min(1, "Password is required"),
});
