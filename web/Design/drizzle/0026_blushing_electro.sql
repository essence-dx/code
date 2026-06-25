CREATE TABLE `website_form_submission` (
	`id` text PRIMARY KEY NOT NULL,
	`publish_id` text NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`section_id` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`publish_id`) REFERENCES `website_publish`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `website_submission_publish_created_idx` ON `website_form_submission` (`publish_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `website_submission_user_created_idx` ON `website_form_submission` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `website_publish` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`seo_title` text NOT NULL,
	`seo_description` text DEFAULT '' NOT NULL,
	`model` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `website_publish_slug_unique` ON `website_publish` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `website_publish_project_unique` ON `website_publish` (`project_id`);--> statement-breakpoint
CREATE INDEX `website_publish_user_updated_idx` ON `website_publish` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `website_publish_status_idx` ON `website_publish` (`status`);