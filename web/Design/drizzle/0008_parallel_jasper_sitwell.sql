CREATE TABLE `brand_font` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`font_family` text NOT NULL,
	`font_size` integer NOT NULL,
	`font_weight` integer NOT NULL,
	`letter_spacing` real NOT NULL,
	`line_height` real NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `brand_font_user_updated_idx` ON `brand_font` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `brand_font_user_role_unique` ON `brand_font` (`user_id`,`role`);