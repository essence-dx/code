ALTER TABLE `project_comment` ADD `task_status` text DEFAULT 'none' NOT NULL;
--> statement-breakpoint
ALTER TABLE `project_comment` ADD `task_assignee_name` text;
--> statement-breakpoint
ALTER TABLE `project_comment` ADD `task_due_at` integer;
--> statement-breakpoint
CREATE INDEX `project_comment_project_task_idx` ON `project_comment` (`project_id`,`task_status`);
--> statement-breakpoint
CREATE INDEX `project_comment_task_due_idx` ON `project_comment` (`task_status`,`task_due_at`);
