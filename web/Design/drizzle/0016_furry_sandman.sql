CREATE TABLE `project_presence` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`user_name` text NOT NULL,
	`color` text NOT NULL,
	`page_id` text NOT NULL,
	`cursor_x` real,
	`cursor_y` real,
	`last_seen_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_presence_project_seen_idx` ON `project_presence` (`project_id`,`last_seen_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_presence_user_unique` ON `project_presence` (`project_id`,`user_id`);