CREATE TABLE `song_audio_files` (
	`song_id` text PRIMARY KEY NOT NULL,
	`mime_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`data_base64` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`song_id`) REFERENCES `songs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `song_audio_files_updated_at_idx` ON `song_audio_files` (`updated_at`);