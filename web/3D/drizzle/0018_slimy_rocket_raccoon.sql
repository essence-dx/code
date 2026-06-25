CREATE TABLE `workspace_release_drill_history` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`actor_user_id` text,
	`actor_name` text,
	`actor_email` text,
	`drill_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`workspace_name` text NOT NULL,
	`score` integer NOT NULL,
	`total_count` integer NOT NULL,
	`ready_count` integer NOT NULL,
	`watch_count` integer NOT NULL,
	`missing_count` integer NOT NULL,
	`blocked_count` integer NOT NULL,
	`json_file_name` text NOT NULL,
	`csv_file_name` text NOT NULL,
	`json_byte_size` integer NOT NULL,
	`csv_byte_size` integer NOT NULL,
	`report` text NOT NULL,
	`drill_rows` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workspace_release_drill_history_workspace_idx` ON `workspace_release_drill_history` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `workspace_release_drill_history_actor_idx` ON `workspace_release_drill_history` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `workspace_release_drill_history_created_idx` ON `workspace_release_drill_history` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `workspace_release_drill_history_hash_idx` ON `workspace_release_drill_history` (`workspace_id`,`content_hash`);