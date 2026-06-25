CREATE TABLE `deck_collaborator` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`user_id` text NOT NULL,
	`invited_email` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`invited_by_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `deck`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deck_collaborator_deck_user_unique` ON `deck_collaborator` (`deck_id`,`user_id`);