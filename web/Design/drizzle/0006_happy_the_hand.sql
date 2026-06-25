CREATE TABLE `brand_color` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`color` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `brand_color_user_updated_idx` ON `brand_color` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `brand_color_user_color_unique` ON `brand_color` (`user_id`,`color`);