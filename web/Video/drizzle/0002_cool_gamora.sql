CREATE TABLE `ai_generation_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text,
	`usage_event_id` text,
	`action` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`status` text NOT NULL,
	`safety_status` text DEFAULT 'allowed' NOT NULL,
	`safety_reason` text,
	`prompt_text` text NOT NULL,
	`prompt_chars` integer DEFAULT 0 NOT NULL,
	`output_chars` integer DEFAULT 0 NOT NULL,
	`output_summary` text,
	`output_asset_kind` text DEFAULT 'none' NOT NULL,
	`output_asset_name` text,
	`error` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`usage_event_id`) REFERENCES `ai_usage_events`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ai_generation_records_user_created_idx` ON `ai_generation_records` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `ai_generation_records_project_created_idx` ON `ai_generation_records` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `ai_generation_records_action_created_idx` ON `ai_generation_records` (`action`,`created_at`);