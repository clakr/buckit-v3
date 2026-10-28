CREATE TABLE `distribution_lines` (
	`id` text PRIMARY KEY,
	`distribution_id` text NOT NULL,
	`bucket_id` text,
	`debt_id` text,
	`amount` integer,
	`basis_points` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_distribution_lines_distribution_id_distributions_id_fk` FOREIGN KEY (`distribution_id`) REFERENCES `distributions`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_distribution_lines_bucket_id_buckets_id_fk` FOREIGN KEY (`bucket_id`) REFERENCES `buckets`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_distribution_lines_debt_id_debts_id_fk` FOREIGN KEY (`debt_id`) REFERENCES `debts`(`id`) ON DELETE CASCADE,
	CONSTRAINT "distribution_lines_one_target" CHECK(("bucket_id" IS NOT NULL AND "debt_id" IS NULL) OR ("bucket_id" IS NULL AND "debt_id" IS NOT NULL)),
	CONSTRAINT "distribution_lines_one_value" CHECK(("amount" IS NOT NULL AND "amount" > 0 AND "basis_points" IS NULL) OR ("amount" IS NULL AND "basis_points" BETWEEN 1 AND 10000))
);
--> statement-breakpoint
CREATE TABLE `distributions` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`bank_account_id` text NOT NULL,
	`name` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_distributions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_distributions_bank_account_id_bank_accounts_id_fk` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `distribution_lines_distribution_id_bucket_id_unique` ON `distribution_lines` (`distribution_id`,`bucket_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `distribution_lines_distribution_id_debt_id_unique` ON `distribution_lines` (`distribution_id`,`debt_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `distributions_user_id_lower_name_unique` ON `distributions` (`user_id`,lower("name"));