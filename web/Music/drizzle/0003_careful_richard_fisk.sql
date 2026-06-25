CREATE TABLE `content_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`target_label` text DEFAULT '' NOT NULL,
	`target_owner_id` text,
	`reporter_user_id` text,
	`reporter_email` text DEFAULT '' NOT NULL,
	`reason` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`admin_note` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`resolved_at` integer,
	FOREIGN KEY (`target_owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`reporter_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `content_reports_status_idx` ON `content_reports` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `content_reports_target_idx` ON `content_reports` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `content_reports_owner_idx` ON `content_reports` (`target_owner_id`);--> statement-breakpoint
CREATE INDEX `content_reports_reporter_idx` ON `content_reports` (`reporter_user_id`);--> statement-breakpoint
ALTER TABLE `playlists` ADD `moderation_status` text DEFAULT 'clean' NOT NULL;--> statement-breakpoint
ALTER TABLE `songs` ADD `moderation_status` text DEFAULT 'clean' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `profile_moderation_status` text DEFAULT 'clean' NOT NULL;