CREATE TABLE `hosted_review_links` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`token` text NOT NULL,
	`permission` text DEFAULT 'comment-only' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`expires_at` integer NOT NULL,
	`title` text NOT NULL,
	`export_name` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hosted_review_links_token_unique` ON `hosted_review_links` (`token`);--> statement-breakpoint
CREATE INDEX `hosted_review_links_owner_id_idx` ON `hosted_review_links` (`owner_id`);--> statement-breakpoint
CREATE INDEX `hosted_review_links_project_id_idx` ON `hosted_review_links` (`project_id`);--> statement-breakpoint
CREATE INDEX `hosted_review_links_expires_at_idx` ON `hosted_review_links` (`expires_at`);