CREATE TABLE `workspace_board_assurance_notification_delivery` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`actor_user_id` text,
	`actor_name` text,
	`actor_email` text,
	`history_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`status` text NOT NULL,
	`notification_count` integer NOT NULL,
	`route_count` integer NOT NULL,
	`eligible_route_count` integer NOT NULL,
	`email_eligible_count` integer NOT NULL,
	`in_app_eligible_count` integer NOT NULL,
	`acknowledged_route_count` integer NOT NULL,
	`pending_acknowledgement_count` integer NOT NULL,
	`retry_needed_count` integer NOT NULL,
	`changed_route_count` integer NOT NULL,
	`new_route_count` integer NOT NULL,
	`removed_route_count` integer NOT NULL,
	`suppressed_route_count` integer NOT NULL,
	`removed_route_dedupe_keys` text DEFAULT '[]' NOT NULL,
	`report` text NOT NULL,
	`routes` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workspace_board_assurance_notification_delivery_workspace_idx` ON `workspace_board_assurance_notification_delivery` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `workspace_board_assurance_notification_delivery_actor_idx` ON `workspace_board_assurance_notification_delivery` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `workspace_board_assurance_notification_delivery_created_idx` ON `workspace_board_assurance_notification_delivery` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `workspace_board_assurance_notification_delivery_hash_idx` ON `workspace_board_assurance_notification_delivery` (`workspace_id`,`content_hash`);
