CREATE TABLE `project_cad_conversion_job` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text,
	`project_id` text NOT NULL,
	`source_file_name` text NOT NULL,
	`source_bytes` integer NOT NULL,
	`source_kind` text NOT NULL,
	`target` text NOT NULL,
	`adapter_id` text NOT NULL,
	`command` text NOT NULL,
	`output_file_name` text NOT NULL,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 3 NOT NULL,
	`diagnostics` text NOT NULL,
	`logs` text DEFAULT '[]' NOT NULL,
	`metadata` text,
	`error_message` text,
	`result_path` text,
	`queued_at` integer NOT NULL,
	`started_at` integer,
	`finished_at` integer,
	`next_attempt_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_cad_conversion_job_workspace_idx` ON `project_cad_conversion_job` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `project_cad_conversion_job_project_idx` ON `project_cad_conversion_job` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_cad_conversion_job_status_idx` ON `project_cad_conversion_job` (`status`);--> statement-breakpoint
CREATE INDEX `project_cad_conversion_job_updated_idx` ON `project_cad_conversion_job` (`updated_at`);