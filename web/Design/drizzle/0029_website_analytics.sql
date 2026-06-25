CREATE TABLE `website_analytics_event` (
  `id` text PRIMARY KEY NOT NULL,
  `publish_id` text NOT NULL,
  `user_id` text NOT NULL,
  `project_id` text NOT NULL,
  `event_type` text NOT NULL,
  `section_id` text,
  `target` text,
  `path` text DEFAULT '' NOT NULL,
  `referrer` text,
  `user_agent` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`publish_id`) REFERENCES `website_publish`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `website_analytics_publish_created_idx` ON `website_analytics_event` (`publish_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `website_analytics_user_created_idx` ON `website_analytics_event` (`user_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `website_analytics_type_created_idx` ON `website_analytics_event` (`publish_id`,`event_type`,`created_at`);
