ALTER TABLE `debts` ADD `date` integer DEFAULT (cast(unixepoch() as integer)) NOT NULL;--> statement-breakpoint
ALTER TABLE `debts` ADD `note` text;