CREATE TABLE `server_export_job` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`project_name` text NOT NULL,
	`format` text NOT NULL,
	`format_label` text NOT NULL,
	`file_name` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`artifact_name` text,
	`artifact_mime_type` text,
	`artifact_size_bytes` integer,
	`artifact_data_url` text,
	`failure_message` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `server_export_user_updated_idx` ON `server_export_job` (`user_id`,`updated_at`);
--> statement-breakpoint
CREATE INDEX `server_export_project_updated_idx` ON `server_export_job` (`project_id`,`updated_at`);
--> statement-breakpoint
CREATE INDEX `server_export_user_status_idx` ON `server_export_job` (`user_id`,`status`);
