CREATE TABLE `workspace_risk_digest_packet` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`actor_user_id` text,
	`actor_name` text,
	`actor_email` text,
	`packet_id` text NOT NULL,
	`content_hash` text NOT NULL,
	`risk_level` text NOT NULL,
	`score` integer NOT NULL,
	`workspace_name` text NOT NULL,
	`json_file_name` text NOT NULL,
	`csv_file_name` text NOT NULL,
	`audit_csv_file_name` text NOT NULL,
	`json_byte_size` integer NOT NULL,
	`csv_byte_size` integer NOT NULL,
	`audit_csv_byte_size` integer NOT NULL,
	`audit_event_count` integer NOT NULL,
	`digest` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workspace_risk_digest_packet_workspace_idx` ON `workspace_risk_digest_packet` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `workspace_risk_digest_packet_actor_idx` ON `workspace_risk_digest_packet` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `workspace_risk_digest_packet_created_idx` ON `workspace_risk_digest_packet` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `workspace_risk_digest_packet_hash_idx` ON `workspace_risk_digest_packet` (`workspace_id`,`content_hash`);