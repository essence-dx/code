CREATE TABLE `team_workspace` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `team_workspace_owner_updated_idx` ON `team_workspace` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `team_workspace_invite` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`invited_by_user_id` text NOT NULL,
	`accepted_by_user_id` text,
	`email` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`token` text NOT NULL,
	`accepted_at` integer,
	`revoked_at` integer,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `team_workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`accepted_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `team_workspace_invite_email_idx` ON `team_workspace_invite` (`email`);--> statement-breakpoint
CREATE INDEX `team_workspace_invite_workspace_created_idx` ON `team_workspace_invite` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_workspace_invite_token_unique` ON `team_workspace_invite` (`token`);--> statement-breakpoint
CREATE TABLE `team_workspace_member` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `team_workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `team_workspace_member_user_updated_idx` ON `team_workspace_member` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `team_workspace_member_workspace_role_idx` ON `team_workspace_member` (`workspace_id`,`role`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_workspace_member_workspace_user_unique` ON `team_workspace_member` (`workspace_id`,`user_id`);