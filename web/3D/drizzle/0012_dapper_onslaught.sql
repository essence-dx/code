ALTER TABLE `project_public_surface_health_snapshot` ADD `screenshot_artifact_id` text;--> statement-breakpoint
ALTER TABLE `project_public_surface_health_snapshot` ADD `screenshot_hash` text;--> statement-breakpoint
ALTER TABLE `project_public_surface_health_snapshot` ADD `screenshot_width` integer;--> statement-breakpoint
ALTER TABLE `project_public_surface_health_snapshot` ADD `screenshot_height` integer;--> statement-breakpoint
ALTER TABLE `project_public_surface_health_snapshot` ADD `screenshot_byte_size` integer;--> statement-breakpoint
ALTER TABLE `project_public_surface_health_snapshot` ADD `screenshot_captured_at` integer;--> statement-breakpoint
ALTER TABLE `project_public_surface_health_snapshot` ADD `screenshot_diff_score` integer;--> statement-breakpoint
ALTER TABLE `project_public_surface_health_snapshot` ADD `screenshot_diff_summary` text;