CREATE TABLE `user_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`blocker_user_id` text NOT NULL,
	`blocked_user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`blocker_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`blocked_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_blocks_blocker_idx` ON `user_blocks` (`blocker_user_id`);--> statement-breakpoint
CREATE INDEX `user_blocks_blocked_idx` ON `user_blocks` (`blocked_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_blocks_unique_idx` ON `user_blocks` (`blocker_user_id`,`blocked_user_id`);--> statement-breakpoint
ALTER TABLE `user` ADD `public_bio` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `public_social_links` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `featured_song_id` text;--> statement-breakpoint
ALTER TABLE `user` ADD `featured_playlist_id` text;--> statement-breakpoint
ALTER TABLE `user` ADD `profile_comments_enabled` integer DEFAULT true NOT NULL;