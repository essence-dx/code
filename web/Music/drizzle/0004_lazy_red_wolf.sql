CREATE TABLE `social_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`target_label` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `social_actions_target_idx` ON `social_actions` (`target_type`,`target_id`,`kind`);--> statement-breakpoint
CREATE INDEX `social_actions_user_idx` ON `social_actions` (`user_id`,`kind`);--> statement-breakpoint
CREATE UNIQUE INDEX `social_actions_unique_idx` ON `social_actions` (`user_id`,`kind`,`target_type`,`target_id`);