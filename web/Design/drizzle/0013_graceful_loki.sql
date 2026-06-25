CREATE TABLE `project_comment` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`page_id` text NOT NULL,
	`element_id` text,
	`author_name` text NOT NULL,
	`body` text NOT NULL,
	`resolved` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_comment_project_created_idx` ON `project_comment` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `project_comment_project_page_idx` ON `project_comment` (`project_id`,`page_id`);