CREATE TABLE `ai_usage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text,
	`action` text NOT NULL,
	`model` text NOT NULL,
	`status` text NOT NULL,
	`prompt_chars` integer DEFAULT 0 NOT NULL,
	`output_chars` integer DEFAULT 0 NOT NULL,
	`error` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ai_usage_events_user_created_idx` ON `ai_usage_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `ai_usage_events_action_created_idx` ON `ai_usage_events` (`action`,`created_at`);