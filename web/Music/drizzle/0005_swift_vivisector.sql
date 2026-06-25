CREATE TABLE `public_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`parent_id` text,
	`user_id` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'visible' NOT NULL,
	`hidden_by_user_id` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`hidden_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `public_comments_target_idx` ON `public_comments` (`target_type`,`target_id`,`status`);--> statement-breakpoint
CREATE INDEX `public_comments_parent_idx` ON `public_comments` (`parent_id`);--> statement-breakpoint
CREATE INDEX `public_comments_user_idx` ON `public_comments` (`user_id`);