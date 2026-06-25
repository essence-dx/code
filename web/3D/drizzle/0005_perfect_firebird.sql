CREATE TABLE `workspace_notification_email_delivery` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text,
	`dedupe_key` text NOT NULL,
	`notification_id` text NOT NULL,
	`source` text NOT NULL,
	`topic` text NOT NULL,
	`recipient_role` text NOT NULL,
	`recipient_email` text NOT NULL,
	`recipient_name` text,
	`subject` text NOT NULL,
	`preview_text` text NOT NULL,
	`text_content` text NOT NULL,
	`html_content` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 3 NOT NULL,
	`last_error` text,
	`next_attempt_at` integer,
	`sent_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workspace_notification_email_delivery_workspace_idx` ON `workspace_notification_email_delivery` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `workspace_notification_email_delivery_user_idx` ON `workspace_notification_email_delivery` (`user_id`);--> statement-breakpoint
CREATE INDEX `workspace_notification_email_delivery_status_idx` ON `workspace_notification_email_delivery` (`workspace_id`,`status`);--> statement-breakpoint
CREATE INDEX `workspace_notification_email_delivery_next_attempt_idx` ON `workspace_notification_email_delivery` (`next_attempt_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_notification_email_delivery_dedupe_idx` ON `workspace_notification_email_delivery` (`dedupe_key`);--> statement-breakpoint
CREATE TABLE `workspace_notification_email_delivery_attempt` (
	`id` text PRIMARY KEY NOT NULL,
	`delivery_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`status` text NOT NULL,
	`attempt_number` integer NOT NULL,
	`provider_message_id` text,
	`error` text,
	`attempted_at` integer NOT NULL,
	FOREIGN KEY (`delivery_id`) REFERENCES `workspace_notification_email_delivery`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workspace_notification_email_delivery_attempt_delivery_idx` ON `workspace_notification_email_delivery_attempt` (`delivery_id`);--> statement-breakpoint
CREATE INDEX `workspace_notification_email_delivery_attempt_workspace_idx` ON `workspace_notification_email_delivery_attempt` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `workspace_notification_email_delivery_attempt_attempted_idx` ON `workspace_notification_email_delivery_attempt` (`attempted_at`);