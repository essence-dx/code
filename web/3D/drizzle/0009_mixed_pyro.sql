CREATE TABLE `project_artifact_registry_entry` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`source_key` text NOT NULL,
	`artifact_id` text NOT NULL,
	`source_version_id` text NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`status` text NOT NULL,
	`visibility` text NOT NULL,
	`signature_state` text NOT NULL,
	`path` text,
	`url` text,
	`requires_auth` integer DEFAULT false NOT NULL,
	`metadata` text,
	`registered_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_artifact_registry_entry_project_idx` ON `project_artifact_registry_entry` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_artifact_registry_entry_kind_idx` ON `project_artifact_registry_entry` (`kind`);--> statement-breakpoint
CREATE INDEX `project_artifact_registry_entry_updated_idx` ON `project_artifact_registry_entry` (`updated_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_artifact_registry_entry_source_key_idx` ON `project_artifact_registry_entry` (`source_key`);