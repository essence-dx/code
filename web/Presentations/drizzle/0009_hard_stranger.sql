CREATE TABLE `deck_share` (
	`id` text PRIMARY KEY NOT NULL,
	`deck_id` text NOT NULL,
	`owner_id` text,
	`token` text NOT NULL,
	`permission` text DEFAULT 'view' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`deck_id`) REFERENCES `deck`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deck_share_token_unique` ON `deck_share` (`token`);