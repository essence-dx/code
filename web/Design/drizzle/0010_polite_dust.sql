ALTER TABLE `project` ADD `public_share_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `project_public_share_id_unique` ON `project` (`public_share_id`);