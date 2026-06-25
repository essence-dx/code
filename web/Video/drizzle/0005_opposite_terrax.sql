CREATE TABLE `project_audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`owner_id` text NOT NULL,
	`action` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_audit_events_project_created_idx` ON `project_audit_events` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `project_audit_events_owner_created_idx` ON `project_audit_events` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `project_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`label` text NOT NULL,
	`action` text DEFAULT 'sync' NOT NULL,
	`layer_count` integer DEFAULT 0 NOT NULL,
	`media_count` integer DEFAULT 0 NOT NULL,
	`duration` integer DEFAULT 0 NOT NULL,
	`version_json` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_versions_project_created_idx` ON `project_versions` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `project_versions_owner_created_idx` ON `project_versions` (`owner_id`,`created_at`);