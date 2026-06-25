CREATE TABLE `workspace_release_readiness_webhook_event` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`provider` text NOT NULL,
	`event_type` text NOT NULL,
	`surface` text NOT NULL,
	`status` text NOT NULL,
	`subject` text NOT NULL,
	`evidence` text NOT NULL,
	`next_action` text NOT NULL,
	`payload_digest` text NOT NULL,
	`raw_body_digest` text NOT NULL,
	`signature_digest` text,
	`signature_state` text NOT NULL,
	`replay_key` text NOT NULL,
	`replay_state` text NOT NULL,
	`replay_reason` text,
	`delivery_state` text NOT NULL,
	`delivery_attempt` text,
	`readiness_row` text NOT NULL,
	`payload` text NOT NULL,
	`received_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workspace_release_readiness_webhook_event_workspace_idx` ON `workspace_release_readiness_webhook_event` (`workspace_id`);
--> statement-breakpoint
CREATE INDEX `workspace_release_readiness_webhook_event_provider_idx` ON `workspace_release_readiness_webhook_event` (`workspace_id`,`provider`);
--> statement-breakpoint
CREATE INDEX `workspace_release_readiness_webhook_event_received_idx` ON `workspace_release_readiness_webhook_event` (`workspace_id`,`received_at`);
--> statement-breakpoint
CREATE INDEX `workspace_release_readiness_webhook_event_replay_idx` ON `workspace_release_readiness_webhook_event` (`workspace_id`,`provider`,`replay_key`);
--> statement-breakpoint
CREATE INDEX `workspace_release_readiness_webhook_event_status_idx` ON `workspace_release_readiness_webhook_event` (`workspace_id`,`status`);
