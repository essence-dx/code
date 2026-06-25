CREATE TABLE `auth_email` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`recipient` text NOT NULL,
	`subject` text NOT NULL,
	`purpose` text NOT NULL,
	`delivery_status` text DEFAULT 'queued' NOT NULL,
	`preview_url` text,
	`error_message` text,
	`sent_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `auth_email_user_created_idx` ON `auth_email` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `auth_email_recipient_created_idx` ON `auth_email` (`recipient`,`created_at`);--> statement-breakpoint
CREATE INDEX `auth_email_purpose_status_idx` ON `auth_email` (`purpose`,`delivery_status`);