CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `project` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text,
	`user_id` text NOT NULL,
	`folder_id` text,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`scene_data` text NOT NULL,
	`share_id` text,
	`share_settings` text,
	`published_at` integer,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`folder_id`) REFERENCES `project_folder`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_share_id_unique` ON `project` (`share_id`);--> statement-breakpoint
CREATE INDEX `project_user_idx` ON `project` (`user_id`);--> statement-breakpoint
CREATE INDEX `project_workspace_idx` ON `project` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `project_access_grant` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_access_grant_project_idx` ON `project_access_grant` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_access_grant_user_idx` ON `project_access_grant` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_access_grant_project_user_idx` ON `project_access_grant` (`project_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `project_audit_event` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`actor_user_id` text,
	`actor_name` text,
	`actor_email` text,
	`category` text NOT NULL,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text,
	`summary` text NOT NULL,
	`metadata` text,
	`tombstone` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `project_audit_event_project_idx` ON `project_audit_event` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_audit_event_actor_idx` ON `project_audit_event` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `project_audit_event_created_idx` ON `project_audit_event` (`created_at`);--> statement-breakpoint
CREATE TABLE `project_collaboration_operation_batch` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`client_id` text NOT NULL,
	`client_sequence` integer DEFAULT 0 NOT NULL,
	`causal_id` text DEFAULT '' NOT NULL,
	`base_updated_at` integer,
	`operations` text NOT NULL,
	`operation_count` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_collaboration_operation_batch_batch_id_unique` ON `project_collaboration_operation_batch` (`batch_id`);--> statement-breakpoint
CREATE INDEX `project_collaboration_operation_batch_project_idx` ON `project_collaboration_operation_batch` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_collaboration_operation_batch_user_idx` ON `project_collaboration_operation_batch` (`user_id`);--> statement-breakpoint
CREATE INDEX `project_collaboration_operation_batch_created_idx` ON `project_collaboration_operation_batch` (`created_at`);--> statement-breakpoint
CREATE INDEX `project_collaboration_operation_batch_causal_idx` ON `project_collaboration_operation_batch` (`project_id`,`client_id`,`client_sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_collaboration_operation_batch_batch_idx` ON `project_collaboration_operation_batch` (`batch_id`);--> statement-breakpoint
CREATE TABLE `project_comment` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`object_id` text,
	`body` text NOT NULL,
	`position` text NOT NULL,
	`resolved_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_comment_project_idx` ON `project_comment` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_comment_user_idx` ON `project_comment` (`user_id`);--> statement-breakpoint
CREATE TABLE `project_folder` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_folder_user_idx` ON `project_folder` (`user_id`);--> statement-breakpoint
CREATE INDEX `project_folder_workspace_idx` ON `project_folder` (`workspace_id`);--> statement-breakpoint
CREATE TABLE `project_folder_access_grant` (
	`id` text PRIMARY KEY NOT NULL,
	`folder_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`folder_id`) REFERENCES `project_folder`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_folder_access_grant_folder_idx` ON `project_folder_access_grant` (`folder_id`);--> statement-breakpoint
CREATE INDEX `project_folder_access_grant_user_idx` ON `project_folder_access_grant` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_folder_access_grant_folder_user_idx` ON `project_folder_access_grant` (`folder_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `project_presence` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`cursor` text,
	`selected_object_id` text,
	`last_seen_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_presence_project_idx` ON `project_presence` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_presence_user_idx` ON `project_presence` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_presence_project_user_idx` ON `project_presence` (`project_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `project_template` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`source_project_id` text,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`scene_data` text NOT NULL,
	`share_settings` text,
	`export_preset_id` text NOT NULL,
	`review_policy_preset_id` text NOT NULL,
	`folder_name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `project_template_workspace_idx` ON `project_template` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `project_template_created_by_idx` ON `project_template` (`created_by_user_id`);--> statement-breakpoint
CREATE INDEX `project_template_source_project_idx` ON `project_template` (`source_project_id`);--> statement-breakpoint
CREATE TABLE `project_version` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`scene_data` text NOT NULL,
	`activity_data` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_version_project_idx` ON `project_version` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_version_user_idx` ON `project_version` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_idx` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_idx` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `workspace` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workspace_owner_idx` ON `workspace` (`owner_user_id`);--> statement-breakpoint
CREATE TABLE `workspace_invite` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`token` text NOT NULL,
	`invited_by_user_id` text NOT NULL,
	`accepted_by_user_id` text,
	`expires_at` integer NOT NULL,
	`accepted_at` integer,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accepted_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_invite_token_unique` ON `workspace_invite` (`token`);--> statement-breakpoint
CREATE INDEX `workspace_invite_workspace_idx` ON `workspace_invite` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `workspace_invite_email_idx` ON `workspace_invite` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_invite_token_idx` ON `workspace_invite` (`token`);--> statement-breakpoint
CREATE TABLE `workspace_member` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workspace_member_workspace_idx` ON `workspace_member` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `workspace_member_user_idx` ON `workspace_member` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_member_workspace_user_idx` ON `workspace_member` (`workspace_id`,`user_id`);