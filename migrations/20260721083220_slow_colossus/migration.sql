CREATE TABLE `allocations` (
	`id` text PRIMARY KEY,
	`bank_account_id` text NOT NULL,
	`bucket_id` text NOT NULL,
	`amount` integer NOT NULL,
	`note` text,
	`date` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_allocations_bank_account_id_bank_accounts_id_fk` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_allocations_bucket_id_buckets_id_fk` FOREIGN KEY (`bucket_id`) REFERENCES `buckets`(`id`) ON DELETE CASCADE
);
