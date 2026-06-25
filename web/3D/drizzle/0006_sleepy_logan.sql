CREATE TABLE `workspace_release_calendar_milestone` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text,
	`source_key` text NOT NULL,
	`kind` text NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`title` text NOT NULL,
	`detail` text NOT NULL,
	`action_label` text NOT NULL,
	`blocker_count` integer DEFAULT 0 NOT NULL,
	`due_at` integer NOT NULL,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workspace_release_calendar_milestone_workspace_idx` ON `workspace_release_calendar_milestone` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `workspace_release_calendar_milestone_project_idx` ON `workspace_release_calendar_milestone` (`project_id`);--> statement-breakpoint
CREATE INDEX `workspace_release_calendar_milestone_status_idx` ON `workspace_release_calendar_milestone` (`workspace_id`,`status`);--> statement-breakpoint
CREATE INDEX `workspace_release_calendar_milestone_due_idx` ON `workspace_release_calendar_milestone` (`workspace_id`,`due_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_release_calendar_milestone_workspace_source_idx` ON `workspace_release_calendar_milestone` (`workspace_id`,`source_key`);