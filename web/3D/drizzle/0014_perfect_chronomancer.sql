CREATE TABLE `project_app_package_certificate` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`preset_id` text,
	`platform` text NOT NULL,
	`source_artifact_id` text,
	`subject` text NOT NULL,
	`issuer` text NOT NULL,
	`serial_number` text NOT NULL,
	`fingerprint_sha256` text NOT NULL,
	`bundle_identifier` text,
	`team_id` text,
	`metadata` text,
	`valid_from` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`uploaded_at` integer NOT NULL,
	`verified_at` integer NOT NULL,
	`revoked_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_app_package_certificate_project_idx` ON `project_app_package_certificate` (`project_id`);--> statement-breakpoint
CREATE INDEX `project_app_package_certificate_platform_idx` ON `project_app_package_certificate` (`project_id`,`platform`);--> statement-breakpoint
CREATE INDEX `project_app_package_certificate_expires_idx` ON `project_app_package_certificate` (`expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_app_package_certificate_unique_idx` ON `project_app_package_certificate` (`project_id`,`preset_id`,`platform`,`fingerprint_sha256`);