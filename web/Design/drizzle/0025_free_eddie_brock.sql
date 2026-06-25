ALTER TABLE `project` ADD `source_project_id` text;--> statement-breakpoint
ALTER TABLE `project` ADD `variant_profile_id` text;--> statement-breakpoint
ALTER TABLE `project` ADD `variant_name` text;--> statement-breakpoint
CREATE INDEX `project_source_project_idx` ON `project` (`source_project_id`);--> statement-breakpoint
CREATE INDEX `project_user_variant_idx` ON `project` (`user_id`,`variant_profile_id`);