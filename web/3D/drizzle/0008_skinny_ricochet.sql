ALTER TABLE `project_data_retention_policy` ADD `purge_review_status` text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `project_data_retention_policy` ADD `purge_review_requested_at` integer;--> statement-breakpoint
ALTER TABLE `project_data_retention_policy` ADD `purge_approved_at` integer;--> statement-breakpoint
ALTER TABLE `project_data_retention_policy` ADD `purge_approved_by_user_id` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `project_data_retention_policy` ADD `purge_approval_note` text;