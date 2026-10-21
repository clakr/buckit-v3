PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_repayments` (
	`id` text PRIMARY KEY,
	`debt_id` text NOT NULL,
	`amount` integer,
	`date` integer,
	`note` text,
	`transaction_id` text UNIQUE,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	CONSTRAINT `fk_repayments_debt_id_debts_id_fk` FOREIGN KEY (`debt_id`) REFERENCES `debts`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_repayments_transaction_id_transactions_id_fk` FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_repayments`(`id`, `debt_id`, `amount`, `date`, `note`, `transaction_id`, `created_at`) SELECT `id`, `debt_id`, `amount`, `date`, `note`, `transaction_id`, `created_at` FROM `repayments`;--> statement-breakpoint
DROP TABLE `repayments`;--> statement-breakpoint
ALTER TABLE `__new_repayments` RENAME TO `repayments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;