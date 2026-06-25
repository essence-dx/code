CREATE TABLE `workspace_compliance_packet_share` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`created_by_user_id` text,
	`created_by_name` text,
	`created_by_email` text,
	`packet_id` text NOT NULL,
	`packet_kind` text NOT NULL,
	`source_label` text NOT NULL,
	`content_hash` text NOT NULL,
	`packet_body` text,
	`key_id` text,
	`signed_at` integer,
	`signer` text,
	`verification_state` text NOT NULL,
	`packet_status` text NOT NULL,
	`recipient_email` text NOT NULL,
	`recipient_name` text,
	`access_purpose` text NOT NULL,
	`token_digest` text NOT NULL,
	`share_url` text NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	`revoked_by_user_id` text,
	`revoked_by_name` text,
	`revoked_by_email` text,
	`revoke_reason` text,
	`last_accessed_at` integer,
	`access_count` integer DEFAULT 0 NOT NULL,
	`download_count` integer DEFAULT 0 NOT NULL,
	`audit_trail` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`revoked_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workspace_compliance_packet_share_workspace_idx` ON `workspace_compliance_packet_share` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `workspace_compliance_packet_share_packet_idx` ON `workspace_compliance_packet_share` (`workspace_id`,`packet_id`);--> statement-breakpoint
CREATE INDEX `workspace_compliance_packet_share_recipient_idx` ON `workspace_compliance_packet_share` (`workspace_id`,`recipient_email`);--> statement-breakpoint
CREATE INDEX `workspace_compliance_packet_share_expires_idx` ON `workspace_compliance_packet_share` (`workspace_id`,`expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_compliance_packet_share_token_idx` ON `workspace_compliance_packet_share` (`token_digest`);
