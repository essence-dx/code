CREATE TABLE `deck_revision` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`owner_id` text,
	`title` text NOT NULL,
	`theme` text NOT NULL,
	`slide_count` integer DEFAULT 0 NOT NULL,
	`snapshot` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `deck`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
