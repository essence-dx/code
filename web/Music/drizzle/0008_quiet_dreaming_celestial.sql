CREATE TABLE `hook_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`source_song_id` text,
	`song_title` text NOT NULL,
	`artist` text DEFAULT 'essencefromexistence' NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`moderation_status` text DEFAULT 'clean' NOT NULL,
	`video_storage_key` text,
	`video_type` text DEFAULT 'video/webm' NOT NULL,
	`video_byte_size` integer DEFAULT 0 NOT NULL,
	`start_ms` integer DEFAULT 0 NOT NULL,
	`duration_ms` integer DEFAULT 0 NOT NULL,
	`overlay_text` text DEFAULT '' NOT NULL,
	`lyrics` text DEFAULT '' NOT NULL,
	`style_prompt` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`published_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `hook_posts_user_id_idx` ON `hook_posts` (`user_id`);--> statement-breakpoint
CREATE INDEX `hook_posts_public_idx` ON `hook_posts` (`visibility`,`moderation_status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `hook_video_files` (
	`hook_id` text PRIMARY KEY NOT NULL,
	`mime_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`data_base64` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`hook_id`) REFERENCES `hook_posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `hook_video_files_updated_at_idx` ON `hook_video_files` (`updated_at`);