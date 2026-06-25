CREATE TABLE `deck_collaborator_invite` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`invited_email` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`invited_by_id` text,
	`accepted_by_id` text,
	`accepted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `deck`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`accepted_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deck_collaborator_invite_deck_email_unique` ON `deck_collaborator_invite` (`deck_id`,`invited_email`);