ALTER TABLE `project` ADD `approval_status` text DEFAULT 'draft' NOT NULL;
--> statement-breakpoint
ALTER TABLE `design_template` ADD `approval_status` text DEFAULT 'draft' NOT NULL;
--> statement-breakpoint
ALTER TABLE `campaign_deliverable` ADD `approval_status` text DEFAULT 'draft' NOT NULL;
--> statement-breakpoint
CREATE INDEX `project_user_approval_idx` ON `project` (`user_id`,`approval_status`);
--> statement-breakpoint
CREATE INDEX `design_template_approval_idx` ON `design_template` (`user_id`,`approval_status`);
--> statement-breakpoint
CREATE INDEX `campaign_deliverable_user_approval_idx` ON `campaign_deliverable` (`user_id`,`approval_status`);
