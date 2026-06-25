CREATE TABLE `notification` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`deck_id` text,
	`type` text NOT NULL,
	`source_id` text,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`href` text DEFAULT '' NOT NULL,
	`read_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deck_id`) REFERENCES `deck`(`id`) ON UPDATE no action ON DELETE set null
);
