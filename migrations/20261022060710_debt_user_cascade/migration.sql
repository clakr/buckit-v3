PRAGMA foreign_keys=OFF;--> statement-breakpoint
-- D1 runs migrations in a transaction, so the pragma above is a no-op and DROP TABLE `debts` cascades into `repayments`. Back them up and restore after the rebuild.
CREATE TABLE `__backup_repayments` AS SELECT `id`, `debt_id`, `amount`, `date`, `note`, `transaction_id`, `created_at` FROM `repayments`;--> statement-breakpoint
CREATE TABLE `__new_debts` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`direction` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`name` text NOT NULL,
	`originating_transaction_id` text,
	`date` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	`note` text,
	`forgiven_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_debts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_debts_originating_transaction_id_transactions_id_fk` FOREIGN KEY (`originating_transaction_id`) REFERENCES `transactions`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
INSERT INTO `__new_debts`(`id`, `user_id`, `direction`, `amount`, `currency`, `name`, `originating_transaction_id`, `date`, `note`, `forgiven_at`, `created_at`) SELECT `id`, `user_id`, `direction`, `amount`, `currency`, `name`, `originating_transaction_id`, `date`, `note`, `forgiven_at`, `created_at` FROM `debts`;--> statement-breakpoint
DROP TABLE `debts`;--> statement-breakpoint
ALTER TABLE `__new_debts` RENAME TO `debts`;--> statement-breakpoint
INSERT INTO `repayments`(`id`, `debt_id`, `amount`, `date`, `note`, `transaction_id`, `created_at`) SELECT `id`, `debt_id`, `amount`, `date`, `note`, `transaction_id`, `created_at` FROM `__backup_repayments`;--> statement-breakpoint
DROP TABLE `__backup_repayments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;