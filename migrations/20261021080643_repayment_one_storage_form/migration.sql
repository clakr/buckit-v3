PRAGMA foreign_keys=OFF;--> statement-breakpoint
DELETE FROM `repayments` WHERE `transaction_id` IS NULL AND `amount` IS NULL;--> statement-breakpoint
UPDATE `repayments` SET `amount` = NULL, `date` = NULL, `note` = NULL WHERE `transaction_id` IS NOT NULL;--> statement-breakpoint
UPDATE `repayments` SET `date` = `created_at` / 1000 WHERE `transaction_id` IS NULL AND `date` IS NULL;--> statement-breakpoint
CREATE TABLE `__new_repayments` (
	`id` text PRIMARY KEY,
	`debt_id` text NOT NULL,
	`amount` integer,
	`date` integer,
	`note` text,
	`transaction_id` text UNIQUE,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_repayments_debt_id_debts_id_fk` FOREIGN KEY (`debt_id`) REFERENCES `debts`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_repayments_transaction_id_transactions_id_fk` FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE CASCADE,
	CONSTRAINT "repayments_one_storage_form" CHECK(("transaction_id" IS NOT NULL AND "amount" IS NULL AND "date" IS NULL AND "note" IS NULL) OR ("transaction_id" IS NULL AND "amount" IS NOT NULL AND "date" IS NOT NULL))
);
--> statement-breakpoint
INSERT INTO `__new_repayments`(`id`, `debt_id`, `amount`, `date`, `note`, `transaction_id`, `created_at`) SELECT `id`, `debt_id`, `amount`, `date`, `note`, `transaction_id`, `created_at` FROM `repayments`;--> statement-breakpoint
DROP TABLE `repayments`;--> statement-breakpoint
ALTER TABLE `__new_repayments` RENAME TO `repayments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;