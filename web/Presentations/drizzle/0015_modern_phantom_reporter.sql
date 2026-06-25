CREATE TABLE `deck_presence` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`user_id` text NOT NULL,
	`slide_id` text,
	`last_seen_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `deck`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
