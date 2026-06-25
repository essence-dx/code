ALTER TABLE `songs` ADD `share_slug` text;--> statement-breakpoint
ALTER TABLE `songs` ADD `published_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `songs_share_slug_idx` ON `songs` (`share_slug`);