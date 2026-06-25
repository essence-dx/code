ALTER TABLE `project` ADD `starred` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `project_user_starred_idx` ON `project` (`user_id`,`starred`);