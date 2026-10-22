CREATE TABLE `goals` (
	`id` text PRIMARY KEY,
	`bucket_id` text NOT NULL UNIQUE,
	`target_amount` integer NOT NULL,
	`currency` text NOT NULL,
	`target_date` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_goals_bucket_id_buckets_id_fk` FOREIGN KEY (`bucket_id`) REFERENCES `buckets`(`id`) ON DELETE CASCADE
);
