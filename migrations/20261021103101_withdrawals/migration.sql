CREATE TABLE `withdrawals` (
	`id` text PRIMARY KEY,
	`bucket_id` text NOT NULL,
	`transaction_id` text NOT NULL UNIQUE,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_withdrawals_bucket_id_buckets_id_fk` FOREIGN KEY (`bucket_id`) REFERENCES `buckets`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_withdrawals_transaction_id_transactions_id_fk` FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE CASCADE
);
