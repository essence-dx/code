CREATE TABLE `presentation_remote_session` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL,
  `user_id` text NOT NULL,
  `control_token` text NOT NULL,
  `active_index` integer DEFAULT 0 NOT NULL,
  `slide_count` integer DEFAULT 1 NOT NULL,
  `page_name` text DEFAULT 'Slide' NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `expires_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `presentation_remote_session_token_unique` ON `presentation_remote_session` (`control_token`);
--> statement-breakpoint
CREATE INDEX `presentation_remote_session_project_user_idx` ON `presentation_remote_session` (`project_id`,`user_id`,`updated_at`);
--> statement-breakpoint
CREATE INDEX `presentation_remote_session_status_expires_idx` ON `presentation_remote_session` (`status`,`expires_at`);
--> statement-breakpoint
CREATE TABLE `presentation_remote_command` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text NOT NULL,
  `action` text NOT NULL,
  `slide_index` integer,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`session_id`) REFERENCES `presentation_remote_session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `presentation_remote_command_session_created_idx` ON `presentation_remote_command` (`session_id`,`created_at`);
