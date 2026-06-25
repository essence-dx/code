CREATE TABLE `content_schedule_item` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text,
	`title` text NOT NULL,
	`channel` text NOT NULL,
	`caption` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`scheduled_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `content_schedule_user_scheduled_idx` ON `content_schedule_item` (`user_id`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `content_schedule_user_status_idx` ON `content_schedule_item` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `content_schedule_project_idx` ON `content_schedule_item` (`project_id`);