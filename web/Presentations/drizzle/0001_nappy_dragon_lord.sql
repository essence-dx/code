ALTER TABLE `slide` ADD `transition` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `slide` ADD `transition_duration_ms` integer DEFAULT 350 NOT NULL;