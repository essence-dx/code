ALTER TABLE `user_asset` ADD `source_provider` text;--> statement-breakpoint
ALTER TABLE `user_asset` ADD `source_url` text;--> statement-breakpoint
ALTER TABLE `user_asset` ADD `author_name` text;--> statement-breakpoint
ALTER TABLE `user_asset` ADD `license_name` text;--> statement-breakpoint
ALTER TABLE `user_asset` ADD `license_url` text;--> statement-breakpoint
CREATE INDEX `user_asset_source_provider_idx` ON `user_asset` (`source_provider`);