CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `ai_generations` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`content_type` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `ai_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ai_generations_job_id_idx` ON `ai_generations` (`job_id`);--> statement-breakpoint
CREATE TABLE `ai_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`kind` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`provider` text DEFAULT 'unconfigured' NOT NULL,
	`model` text DEFAULT '' NOT NULL,
	`input` text,
	`output` text,
	`error` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `ai_jobs_user_id_idx` ON `ai_jobs` (`user_id`);--> statement-breakpoint
CREATE INDEX `ai_jobs_kind_status_idx` ON `ai_jobs` (`kind`,`status`);--> statement-breakpoint
CREATE TABLE `generated_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text,
	`user_id` text,
	`type` text NOT NULL,
	`storage_key` text,
	`media_type` text DEFAULT 'text/plain' NOT NULL,
	`title` text NOT NULL,
	`text_content` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `ai_jobs`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `generated_assets_job_id_idx` ON `generated_assets` (`job_id`);--> statement-breakpoint
CREATE INDEX `generated_assets_user_id_idx` ON `generated_assets` (`user_id`);--> statement-breakpoint
CREATE TABLE `playlist_songs` (
	`playlist_id` text NOT NULL,
	`song_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`added_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	PRIMARY KEY(`playlist_id`, `song_id`),
	FOREIGN KEY (`playlist_id`) REFERENCES `playlists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`song_id`) REFERENCES `songs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `playlist_songs_song_id_idx` ON `playlist_songs` (`song_id`);--> statement-breakpoint
CREATE TABLE `playlists` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `playlists_user_id_idx` ON `playlists` (`user_id`);--> statement-breakpoint
CREATE TABLE `provider_events` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text,
	`provider` text NOT NULL,
	`event_type` text NOT NULL,
	`payload` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `ai_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `provider_events_job_id_idx` ON `provider_events` (`job_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_idx` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `song_analysis` (
	`song_id` text PRIMARY KEY NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`mood` text DEFAULT '' NOT NULL,
	`instruments` text DEFAULT '[]' NOT NULL,
	`sections` text,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`song_id`) REFERENCES `songs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `songs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`title` text NOT NULL,
	`artist` text DEFAULT 'essencefromexistence' NOT NULL,
	`source` text NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`audio_storage_key` text,
	`cover_image_url` text,
	`lyrics` text DEFAULT '' NOT NULL,
	`style_prompt` text DEFAULT '' NOT NULL,
	`duration_ms` integer DEFAULT 0 NOT NULL,
	`bpm` integer,
	`musical_key` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`liked` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `songs_user_id_idx` ON `songs` (`user_id`);--> statement-breakpoint
CREATE INDEX `songs_created_at_idx` ON `songs` (`created_at`);--> statement-breakpoint
CREATE TABLE `studio_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`title` text NOT NULL,
	`bpm` integer DEFAULT 120 NOT NULL,
	`time_signature` text DEFAULT '4/4' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `studio_projects_user_id_idx` ON `studio_projects` (`user_id`);--> statement-breakpoint
CREATE TABLE `studio_regions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`song_id` text,
	`track_name` text NOT NULL,
	`start_ms` integer NOT NULL,
	`end_ms` integer NOT NULL,
	`gain_db` real DEFAULT 0 NOT NULL,
	`pan` real DEFAULT 0 NOT NULL,
	`muted` integer DEFAULT false NOT NULL,
	`solo` integer DEFAULT false NOT NULL,
	`color` text DEFAULT '#6ee7b7' NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `studio_projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`song_id`) REFERENCES `songs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `studio_regions_project_id_idx` ON `studio_regions` (`project_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_idx` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `user_ai_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`text_model` text DEFAULT '' NOT NULL,
	`image_model` text DEFAULT '' NOT NULL,
	`audio_provider_url` text DEFAULT '' NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);