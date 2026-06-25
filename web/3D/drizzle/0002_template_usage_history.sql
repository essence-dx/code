ALTER TABLE `project_template` ADD `use_count` integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `project_template` ADD `last_used_at` integer;--> statement-breakpoint
ALTER TABLE `project_template` ADD `last_used_by_user_id` text REFERENCES `user`(`id`) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `project_template` ADD `last_used_project_id` text REFERENCES `project`(`id`) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `project_template` ADD `version` integer NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `project_template` ADD `version_history` text NOT NULL DEFAULT '[]';--> statement-breakpoint
CREATE INDEX `project_template_last_used_idx` ON `project_template` (`last_used_at`);
