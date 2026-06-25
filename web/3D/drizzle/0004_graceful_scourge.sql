CREATE TABLE `workspace_scene_qa_baseline` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text,
	`template_id` text,
	`deployment_id` text NOT NULL,
	`comparison_id` text NOT NULL,
	`snapshot_comparison_id` text NOT NULL,
	`surface` text NOT NULL,
	`target_name` text NOT NULL,
	`status` text NOT NULL,
	`actual_signature` text,
	`expected_signature` text,
	`issue_count` integer DEFAULT 0 NOT NULL,
	`issues` text DEFAULT '[]' NOT NULL,
	`path` text,
	`captured_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workspace_scene_qa_baseline_workspace_idx` ON `workspace_scene_qa_baseline` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `workspace_scene_qa_baseline_deployment_idx` ON `workspace_scene_qa_baseline` (`workspace_id`,`deployment_id`);--> statement-breakpoint
CREATE INDEX `workspace_scene_qa_baseline_captured_idx` ON `workspace_scene_qa_baseline` (`workspace_id`,`captured_at`);--> statement-breakpoint
CREATE INDEX `workspace_scene_qa_baseline_project_idx` ON `workspace_scene_qa_baseline` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_scene_qa_baseline_workspace_deployment_comparison_idx` ON `workspace_scene_qa_baseline` (`workspace_id`,`deployment_id`,`comparison_id`);