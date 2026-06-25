ALTER TABLE `design_template` ADD `marketplace_status` text DEFAULT 'draft' NOT NULL;
--> statement-breakpoint
ALTER TABLE `design_template` ADD `marketplace_collection` text;
--> statement-breakpoint
ALTER TABLE `design_template` ADD `marketplace_season` text;
--> statement-breakpoint
ALTER TABLE `design_template` ADD `marketplace_review_note` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `design_template` ADD `marketplace_published_at` integer;
--> statement-breakpoint
ALTER TABLE `design_template` ADD `marketplace_use_count` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `design_template` ADD `marketplace_view_count` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE INDEX `design_template_marketplace_status_idx` ON `design_template` (`marketplace_status`,`updated_at`);
--> statement-breakpoint
CREATE INDEX `design_template_marketplace_collection_idx` ON `design_template` (`marketplace_collection`,`marketplace_status`);
--> statement-breakpoint
CREATE INDEX `design_template_marketplace_usage_idx` ON `design_template` (`marketplace_use_count`);
