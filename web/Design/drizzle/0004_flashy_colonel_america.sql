CREATE TABLE `project_version` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`document` text NOT NULL,
	`thumbnail` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_version_project_created_idx` ON `project_version` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `project_version_user_created_idx` ON `project_version` (`user_id`,`created_at`);