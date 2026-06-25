CREATE TABLE `project_permission_overrides` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text NOT NULL,
	`member_email` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_permission_overrides_project_idx` ON `project_permission_overrides` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_permission_overrides_project_email_unique` ON `project_permission_overrides` (`project_id`,`member_email`);--> statement-breakpoint
CREATE TABLE `workspace_audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`project_id` text,
	`actor_id` text,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text,
	`detail` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workspace_audit_events_workspace_created_idx` ON `workspace_audit_events` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `workspace_audit_events_project_created_idx` ON `workspace_audit_events` (`project_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `workspace_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`invited_by_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_invitations_token_unique` ON `workspace_invitations` (`token`);--> statement-breakpoint
CREATE INDEX `workspace_invitations_workspace_status_idx` ON `workspace_invitations` (`workspace_id`,`status`);--> statement-breakpoint
CREATE INDEX `workspace_invitations_email_idx` ON `workspace_invitations` (`email`);--> statement-breakpoint
CREATE TABLE `workspace_members` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workspace_members_workspace_id_idx` ON `workspace_members` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `workspace_members_user_id_idx` ON `workspace_members` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_members_workspace_email_unique` ON `workspace_members` (`workspace_id`,`email`);--> statement-breakpoint
ALTER TABLE `comments` ADD `time_end` integer;--> statement-breakpoint
ALTER TABLE `comments` ADD `canvas_x` integer;--> statement-breakpoint
ALTER TABLE `comments` ADD `canvas_y` integer;--> statement-breakpoint
ALTER TABLE `folders` ADD `owner_id` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `folders` ADD `visibility` text DEFAULT 'workspace' NOT NULL;--> statement-breakpoint
CREATE INDEX `folders_owner_id_idx` ON `folders` (`owner_id`);--> statement-breakpoint
ALTER TABLE `projects` ADD `folder_access` text DEFAULT 'inherited' NOT NULL;