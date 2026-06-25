ALTER TABLE `deck_asset` ADD `storage_provider` text DEFAULT 'database' NOT NULL;--> statement-breakpoint
ALTER TABLE `deck_asset` ADD `storage_key` text;