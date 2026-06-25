CREATE TABLE `project_folder` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_folder_user_updated_idx` ON `project_folder` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_folder_user_name_unique` ON `project_folder` (`user_id`,`name`);--> statement-breakpoint
ALTER TABLE `project` ADD `folder_id` text REFERENCES project_folder(id);--> statement-breakpoint
CREATE INDEX `project_user_folder_idx` ON `project` (`user_id`,`folder_id`);