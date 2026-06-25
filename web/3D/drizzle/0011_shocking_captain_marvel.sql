CREATE TABLE `workspace_release_runbook_record` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text,
	`project_name` text,
	`batch_id` text NOT NULL,
	`source_key` text NOT NULL,
	`milestone_id` text NOT NULL,
	`title` text NOT NULL,
	`detail` text NOT NULL,
	`status` text NOT NULL,
	`owner_user_id` text,
	`owner_name` text NOT NULL,
	`owner_email` text,
	`due_at` integer NOT NULL,
	`completed_at` integer,
	`checklist_evidence` text DEFAULT '[]' NOT NULL,
	`audit_log_href` text NOT NULL,
	`blocker_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workspace_release_runbook_record_workspace_idx` ON `workspace_release_runbook_record` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `workspace_release_runbook_record_project_idx` ON `workspace_release_runbook_record` (`project_id`);--> statement-breakpoint
CREATE INDEX `workspace_release_runbook_record_owner_idx` ON `workspace_release_runbook_record` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `workspace_release_runbook_record_status_idx` ON `workspace_release_runbook_record` (`workspace_id`,`status`);--> statement-breakpoint
CREATE INDEX `workspace_release_runbook_record_due_idx` ON `workspace_release_runbook_record` (`workspace_id`,`due_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_release_runbook_record_batch_source_idx` ON `workspace_release_runbook_record` (`workspace_id`,`batch_id`,`source_key`);