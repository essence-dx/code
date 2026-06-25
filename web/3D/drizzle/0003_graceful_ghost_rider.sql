CREATE TABLE `workspace_notification_delivery_preference` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`topic` text NOT NULL,
	`in_app_enabled` integer DEFAULT true NOT NULL,
	`email_enabled` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workspace_notification_delivery_preference_workspace_idx` ON `workspace_notification_delivery_preference` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `workspace_notification_delivery_preference_user_idx` ON `workspace_notification_delivery_preference` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_notification_delivery_preference_workspace_user_topic_idx` ON `workspace_notification_delivery_preference` (`workspace_id`,`user_id`,`topic`);
