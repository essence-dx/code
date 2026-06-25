CREATE TABLE `project_health_notification_state` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`notification_id` text NOT NULL,
	`read_at` integer,
	`dismissed_at` integer,
	`snoozed_until` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_health_notification_state_user_idx` ON `project_health_notification_state` (`user_id`);--> statement-breakpoint
CREATE INDEX `project_health_notification_state_project_idx` ON `project_health_notification_state` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_health_notification_state_notification_idx` ON `project_health_notification_state` (`notification_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_health_notification_state_user_notification_idx` ON `project_health_notification_state` (`user_id`,`notification_id`);