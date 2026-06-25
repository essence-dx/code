CREATE TABLE `workspace_regression_watchlist_item_state` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text NOT NULL,
	`item_id` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`note` text,
	`owner_user_id` text,
	`owner_name` text,
	`owner_email` text,
	`snoozed_until` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workspace_regression_watchlist_item_state_workspace_idx` ON `workspace_regression_watchlist_item_state` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `workspace_regression_watchlist_item_state_project_idx` ON `workspace_regression_watchlist_item_state` (`project_id`);--> statement-breakpoint
CREATE INDEX `workspace_regression_watchlist_item_state_owner_idx` ON `workspace_regression_watchlist_item_state` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `workspace_regression_watchlist_item_state_status_idx` ON `workspace_regression_watchlist_item_state` (`workspace_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_regression_watchlist_item_state_workspace_item_idx` ON `workspace_regression_watchlist_item_state` (`workspace_id`,`item_id`);--> statement-breakpoint
CREATE TABLE `workspace_regression_watchlist_snapshot` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`actor_user_id` text,
	`actor_name` text,
	`actor_email` text,
	`snapshot_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`workspace_name` text NOT NULL,
	`item_count` integer NOT NULL,
	`severe_count` integer NOT NULL,
	`recurring_count` integer NOT NULL,
	`json_file_name` text NOT NULL,
	`csv_file_name` text NOT NULL,
	`json_byte_size` integer NOT NULL,
	`csv_byte_size` integer NOT NULL,
	`report` text NOT NULL,
	`states` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workspace_regression_watchlist_snapshot_workspace_idx` ON `workspace_regression_watchlist_snapshot` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `workspace_regression_watchlist_snapshot_actor_idx` ON `workspace_regression_watchlist_snapshot` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `workspace_regression_watchlist_snapshot_created_idx` ON `workspace_regression_watchlist_snapshot` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `workspace_regression_watchlist_snapshot_hash_idx` ON `workspace_regression_watchlist_snapshot` (`workspace_id`,`content_hash`);