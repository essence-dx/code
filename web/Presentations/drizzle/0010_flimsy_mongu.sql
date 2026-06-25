CREATE TABLE `deck_share_view` (
	`id` text PRIMARY KEY NOT NULL,
	`share_id` text NOT NULL,
	`deck_id` text NOT NULL,
	`user_agent` text,
	`referrer` text,
	`viewed_at` integer NOT NULL,
	FOREIGN KEY (`share_id`) REFERENCES `deck_share`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deck_id`) REFERENCES `deck`(`id`) ON UPDATE no action ON DELETE cascade
);
