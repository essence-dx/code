CREATE TABLE `workspace_role_access_review_attestation` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`actor_user_id` text,
	`actor_name` text,
	`actor_email` text,
	`campaign_id` text NOT NULL,
	`scope_hash` text NOT NULL,
	`member_id` text NOT NULL,
	`member_user_id` text NOT NULL,
	`member_email` text NOT NULL,
	`member_name` text NOT NULL,
	`workspace_role` text NOT NULL,
	`status` text NOT NULL,
	`note` text,
	`grant_evidence` text NOT NULL,
	`review_scope_count` integer NOT NULL,
	`attested_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`member_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workspace_role_access_review_attestation_workspace_idx` ON `workspace_role_access_review_attestation` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `workspace_role_access_review_attestation_actor_idx` ON `workspace_role_access_review_attestation` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `workspace_role_access_review_attestation_member_idx` ON `workspace_role_access_review_attestation` (`member_user_id`);--> statement-breakpoint
CREATE INDEX `workspace_role_access_review_attestation_campaign_idx` ON `workspace_role_access_review_attestation` (`workspace_id`,`campaign_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_role_access_review_attestation_member_unique_idx` ON `workspace_role_access_review_attestation` (`workspace_id`,`campaign_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `workspace_role_access_review_reminder_delivery` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`actor_user_id` text,
	`actor_name` text,
	`actor_email` text,
	`campaign_id` text NOT NULL,
	`scope_hash` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`member_id` text NOT NULL,
	`member_user_id` text NOT NULL,
	`recipient_email` text NOT NULL,
	`recipient_name` text NOT NULL,
	`channel` text NOT NULL,
	`subject` text NOT NULL,
	`preview_text` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`provider_message_id` text,
	`error` text,
	`sent_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`member_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workspace_role_access_review_reminder_workspace_idx` ON `workspace_role_access_review_reminder_delivery` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `workspace_role_access_review_reminder_actor_idx` ON `workspace_role_access_review_reminder_delivery` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `workspace_role_access_review_reminder_member_idx` ON `workspace_role_access_review_reminder_delivery` (`member_user_id`);--> statement-breakpoint
CREATE INDEX `workspace_role_access_review_reminder_campaign_idx` ON `workspace_role_access_review_reminder_delivery` (`workspace_id`,`campaign_id`);--> statement-breakpoint
CREATE INDEX `workspace_role_access_review_reminder_status_idx` ON `workspace_role_access_review_reminder_delivery` (`workspace_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_role_access_review_reminder_dedupe_idx` ON `workspace_role_access_review_reminder_delivery` (`dedupe_key`);