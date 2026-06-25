CREATE TABLE `project_public_surface_health_snapshot` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text,
	`batch_id` text NOT NULL,
	`source_key` text NOT NULL,
	`source_version_id` text NOT NULL,
	`surface` text NOT NULL,
	`label` text NOT NULL,
	`status` text NOT NULL,
	`status_code` integer,
	`latency_ms` integer,
	`path` text,
	`url` text,
	`screenshot_path` text,
	`screenshot_state` text NOT NULL,
	`issues` text DEFAULT '[]' NOT NULL,
	`checked_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `project_public_surface_health_snapshot_workspace_idx` ON `project_public_surface_health_snapshot` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `project_public_surface_health_snapshot_project_idx` ON `project_public_surface_health_snapshot` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_public_surface_health_snapshot_status_idx` ON `project_public_surface_health_snapshot` (`workspace_id`,`status`);--> statement-breakpoint
CREATE INDEX `project_public_surface_health_snapshot_checked_idx` ON `project_public_surface_health_snapshot` (`workspace_id`,`checked_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_public_surface_health_snapshot_batch_source_idx` ON `project_public_surface_health_snapshot` (`workspace_id`,`batch_id`,`source_key`);