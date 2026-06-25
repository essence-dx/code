CREATE TABLE `presentation_response` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL,
  `page_id` text NOT NULL,
  `interaction_id` text NOT NULL,
  `participant_name` text DEFAULT 'Guest' NOT NULL,
  `response_kind` text NOT NULL,
  `answer` text,
  `body` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `presentation_response_project_created_idx` ON `presentation_response` (`project_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `presentation_response_interaction_idx` ON `presentation_response` (`project_id`,`page_id`,`interaction_id`);
