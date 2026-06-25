ALTER TABLE `project` ADD `edit_share_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `project_edit_share_id_unique` ON `project` (`edit_share_id`);