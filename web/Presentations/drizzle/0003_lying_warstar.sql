CREATE TABLE `deck_asset` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`type` text DEFAULT 'image' NOT NULL,
	`name` text NOT NULL,
	`mime_type` text NOT NULL,
	`data_url` text NOT NULL,
	`size_bytes` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `deck`(`id`) ON UPDATE no action ON DELETE cascade
);
