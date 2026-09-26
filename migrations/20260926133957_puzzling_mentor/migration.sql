CREATE TABLE `debts` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`direction` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`name` text NOT NULL,
	CONSTRAINT `fk_debts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
