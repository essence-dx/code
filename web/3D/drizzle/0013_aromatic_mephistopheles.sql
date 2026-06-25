ALTER TABLE `workspace_release_runbook_record` ADD `comments` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspace_release_runbook_record` ADD `attachments` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspace_release_runbook_record` ADD `transition_history` text DEFAULT '[]' NOT NULL;