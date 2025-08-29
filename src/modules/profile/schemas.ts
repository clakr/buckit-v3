import z from "zod";

export const profileBaseSchema = z.object({
	id: z.string().uuid("Invalid Profile ID"),

	first_name: z
		.string()
		.min(2, "First name must be at least 2 characters")
		.max(50, "First name must be less than 50 characters")
		.regex(
			/^[a-zA-Z\s'-]+$/,
			"First name can only contain letters, spaces, hyphens, and apostrophes",
		)
		.trim()
		.nullable()
		.optional(),

	last_name: z
		.string()
		.min(2, "Last name must be at least 2 characters")
		.max(50, "Last name must be less than 50 characters")
		.regex(
			/^[a-zA-Z\s'-]+$/,
			"Last name can only contain letters, spaces, hyphens, and apostrophes",
		)
		.trim()
		.nullable()
		.optional(),

	username: z
		.string()
		.min(3, "Username must be at least 3 characters")
		.max(30, "Username must be less than 30 characters")
		.regex(
			/^[a-zA-Z0-9_-]+$/,
			"Username can only contain letters, numbers, underscores, and hyphens",
		)
		.toLowerCase()
		.trim()
		.nullable()
		.optional(),

	avatar_url: z.string().url("Please enter a valid URL").nullable().optional(),
});

export const updateProfileFormSchema = profileBaseSchema;
