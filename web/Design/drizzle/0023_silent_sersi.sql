CREATE TABLE `user_two_factor` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`secret` text NOT NULL,
	`enabled_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_two_factor_user_unique` ON `user_two_factor` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_two_factor_enabled_idx` ON `user_two_factor` (`enabled_at`);