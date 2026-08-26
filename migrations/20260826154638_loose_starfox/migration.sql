ALTER TABLE `accounts` ADD `issuer` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `account_issuer_accountId_uidx` ON `accounts` (`issuer`,`account_id`);