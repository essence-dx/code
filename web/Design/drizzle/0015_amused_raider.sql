CREATE TABLE `project_comment_reaction` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`comment_id` text NOT NULL,
	`user_id` text NOT NULL,
	`reaction` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`comment_id`) REFERENCES `project_comment`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_comment_reaction_project_idx` ON `project_comment_reaction` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_comment_reaction_user_unique` ON `project_comment_reaction` (`comment_id`,`user_id`,`reaction`);