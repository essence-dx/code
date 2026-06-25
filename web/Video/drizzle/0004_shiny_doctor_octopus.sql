CREATE TABLE `hosted_review_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`link_id` text NOT NULL,
	`project_id` text NOT NULL,
	`reviewer_name` text DEFAULT 'Reviewer' NOT NULL,
	`reviewer_email` text,
	`body` text NOT NULL,
	`time` integer,
	`anchor_label` text,
	`resolved_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`link_id`) REFERENCES `hosted_review_links`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `hosted_review_comments_link_id_idx` ON `hosted_review_comments` (`link_id`);--> statement-breakpoint
CREATE INDEX `hosted_review_comments_project_id_idx` ON `hosted_review_comments` (`project_id`);--> statement-breakpoint
CREATE INDEX `hosted_review_comments_created_at_idx` ON `hosted_review_comments` (`created_at`);