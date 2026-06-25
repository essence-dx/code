CREATE TABLE `workspace_board_approval_packet` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`created_by_user_id` text,
	`created_by_name` text,
	`created_by_email` text,
	`packet_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`record_status` text DEFAULT 'active' NOT NULL,
	`approval_status` text NOT NULL,
	`approval_score` integer NOT NULL,
	`blocked_sign_off_count` integer NOT NULL,
	`watch_sign_off_count` integer NOT NULL,
	`ready_sign_off_count` integer NOT NULL,
	`critical_path_count` integer NOT NULL,
	`recipient_email` text,
	`recipient_name` text,
	`recipient_purpose` text NOT NULL,
	`json_file_name` text NOT NULL,
	`csv_file_name` text NOT NULL,
	`json_byte_size` integer NOT NULL,
	`csv_byte_size` integer NOT NULL,
	`packet` text NOT NULL,
	`revoked_at` integer,
	`revoked_by_user_id` text,
	`revoked_by_name` text,
	`revoked_by_email` text,
	`revoke_reason` text,
	`download_count` integer DEFAULT 0 NOT NULL,
	`audit_trail` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`revoked_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workspace_board_approval_packet_workspace_idx` ON `workspace_board_approval_packet` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `workspace_board_approval_packet_created_by_idx` ON `workspace_board_approval_packet` (`created_by_user_id`);--> statement-breakpoint
CREATE INDEX `workspace_board_approval_packet_packet_idx` ON `workspace_board_approval_packet` (`workspace_id`,`packet_id`);--> statement-breakpoint
CREATE INDEX `workspace_board_approval_packet_status_idx` ON `workspace_board_approval_packet` (`workspace_id`,`record_status`);--> statement-breakpoint
CREATE INDEX `workspace_board_approval_packet_created_idx` ON `workspace_board_approval_packet` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `workspace_board_approval_packet_hash_idx` ON `workspace_board_approval_packet` (`workspace_id`,`content_hash`);
