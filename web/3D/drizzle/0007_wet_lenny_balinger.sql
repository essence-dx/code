CREATE TABLE `project_data_retention_policy` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`audit_log_days` integer DEFAULT 730 NOT NULL,
	`comment_days` integer DEFAULT 365 NOT NULL,
	`version_days` integer DEFAULT 180 NOT NULL,
	`deleted_asset_tombstone_days` integer DEFAULT 730 NOT NULL,
	`updated_by_user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `project_data_retention_policy_project_idx` ON `project_data_retention_policy` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_data_retention_policy_updated_by_idx` ON `project_data_retention_policy` (`updated_by_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_data_retention_policy_project_unique_idx` ON `project_data_retention_policy` (`project_id`);