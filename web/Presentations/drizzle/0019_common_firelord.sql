CREATE TABLE `deck_collaboration_event` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`type` text NOT NULL,
	`client_event_id` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `deck`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deck_collaboration_event_client_unique` ON `deck_collaboration_event` (`deck_id`,`user_id`,`client_event_id`);