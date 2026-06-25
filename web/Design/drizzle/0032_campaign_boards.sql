CREATE TABLE `campaign_board` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`brief` text DEFAULT '' NOT NULL,
	`goal` text DEFAULT '' NOT NULL,
	`audience` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`primary_brand_color` text,
	`brand_logo_name` text,
	`brand_font_family` text,
	`launch_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `campaign_board_user_updated_idx` ON `campaign_board` (`user_id`,`updated_at`);
--> statement-breakpoint
CREATE INDEX `campaign_board_user_status_idx` ON `campaign_board` (`user_id`,`status`);
--> statement-breakpoint
CREATE TABLE `campaign_deliverable` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text,
	`role` text NOT NULL,
	`channel` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaign_board`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `campaign_deliverable_campaign_idx` ON `campaign_deliverable` (`campaign_id`);
--> statement-breakpoint
CREATE INDEX `campaign_deliverable_user_project_idx` ON `campaign_deliverable` (`user_id`,`project_id`);
--> statement-breakpoint
CREATE INDEX `campaign_deliverable_user_status_idx` ON `campaign_deliverable` (`user_id`,`status`);
