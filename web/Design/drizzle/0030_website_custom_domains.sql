CREATE TABLE `website_custom_domain` (
  `id` text PRIMARY KEY NOT NULL,
  `publish_id` text NOT NULL,
  `user_id` text NOT NULL,
  `project_id` text NOT NULL,
  `domain` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `verification_name` text NOT NULL,
  `verification_value` text NOT NULL,
  `verified_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`publish_id`) REFERENCES `website_publish`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `website_custom_domain_unique` ON `website_custom_domain` (`domain`);
--> statement-breakpoint
CREATE INDEX `website_custom_domain_publish_idx` ON `website_custom_domain` (`publish_id`);
--> statement-breakpoint
CREATE INDEX `website_custom_domain_user_updated_idx` ON `website_custom_domain` (`user_id`,`updated_at`);
--> statement-breakpoint
CREATE INDEX `website_custom_domain_status_idx` ON `website_custom_domain` (`status`);
