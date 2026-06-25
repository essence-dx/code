CREATE TABLE `workspace_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`actor_user_id` text,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text,
	`summary` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workspace_audit_user_created_idx` ON `workspace_audit_log` (`user_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `workspace_audit_user_action_idx` ON `workspace_audit_log` (`user_id`,`action`);
--> statement-breakpoint
CREATE INDEX `workspace_audit_target_idx` ON `workspace_audit_log` (`target_type`,`target_id`);
