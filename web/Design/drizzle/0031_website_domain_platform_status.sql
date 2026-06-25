ALTER TABLE `website_custom_domain` ADD `platform_status` text DEFAULT 'manual' NOT NULL;
--> statement-breakpoint
ALTER TABLE `website_custom_domain` ADD `platform_error` text;
--> statement-breakpoint
ALTER TABLE `website_custom_domain` ADD `platform_attached_at` integer;
