import { strict as assert } from "node:assert";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const migrationDir = join(process.cwd(), "drizzle");
const metaDir = join(migrationDir, "meta");
const journalPath = join(metaDir, "_journal.json");

assert.ok(existsSync(migrationDir), "drizzle migration directory is missing");
assert.ok(existsSync(journalPath), "drizzle migration journal is missing");

const snapshotFiles = readdirSync(metaDir)
  .filter((file) => file.endsWith("_snapshot.json"))
  .sort();

assert.ok(snapshotFiles.length > 0, "drizzle migration snapshot is missing");

const sqlFiles = readdirSync(migrationDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

assert.ok(sqlFiles.length > 0, "at least one SQL migration is required");

const migrationSql = sqlFiles.map((file) => readFileSync(join(migrationDir, file), "utf8")).join("\n");
const snapshot = JSON.parse(readFileSync(join(metaDir, snapshotFiles.at(-1) ?? ""), "utf8")) as {
  tables?: Record<string, unknown>;
};
const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
  entries?: Array<{ tag?: string }>;
};

const requiredSqlFragments = [
  "CREATE TABLE `project_audit_event`",
  "`actor_name` text",
  "`actor_email` text",
  "CREATE INDEX `project_audit_event_project_idx`",
  "CREATE TABLE `project_template`",
  "`workspace_id` text NOT NULL",
  "`source_project_id` text",
  "`share_settings` text",
  "`export_preset_id` text NOT NULL",
  "`review_policy_preset_id` text NOT NULL",
  "`use_count` integer NOT NULL DEFAULT 0",
  "`last_used_at` integer",
  "`last_used_by_user_id` text",
  "`last_used_project_id` text",
  "`version` integer NOT NULL DEFAULT 1",
  "`version_history` text NOT NULL DEFAULT '[]'",
  "CREATE INDEX `project_template_workspace_idx`",
  "CREATE INDEX `project_template_last_used_idx`",
  "CREATE TABLE `workspace`",
  "CREATE TABLE `workspace_member`",
  "CREATE TABLE `workspace_invite`",
  "`share_settings` text",
  "`published_at` integer",
  "CREATE TABLE `project_health_notification_state`",
  "`notification_id` text NOT NULL",
  "`read_at` integer",
  "`dismissed_at` integer",
  "`snoozed_until` integer",
  "CREATE UNIQUE INDEX `project_health_notification_state_user_notification_idx`",
  "CREATE TABLE `project_data_retention_policy`",
  "`audit_log_days` integer DEFAULT 730 NOT NULL",
  "`comment_days` integer DEFAULT 365 NOT NULL",
  "`version_days` integer DEFAULT 180 NOT NULL",
  "`deleted_asset_tombstone_days` integer DEFAULT 730 NOT NULL",
  "`purge_review_status` text DEFAULT 'draft' NOT NULL",
  "`purge_review_requested_at` integer",
  "`purge_approved_at` integer",
  "`purge_approved_by_user_id` text",
  "`purge_approval_note` text",
  "`updated_by_user_id` text",
  "CREATE UNIQUE INDEX `project_data_retention_policy_project_unique_idx`",
  "CREATE TABLE `project_artifact_registry_entry`",
  "`source_key` text NOT NULL",
  "`artifact_id` text NOT NULL",
  "`source_version_id` text NOT NULL",
  "`signature_state` text NOT NULL",
  "`requires_auth` integer DEFAULT false NOT NULL",
  "CREATE UNIQUE INDEX `project_artifact_registry_entry_source_key_idx`",
  "CREATE TABLE `workspace_notification_delivery_preference`",
  "`in_app_enabled` integer",
  "`email_enabled` integer",
  "CREATE UNIQUE INDEX `workspace_notification_delivery_preference_workspace_user_topic_idx`",
  "CREATE TABLE `workspace_scene_qa_baseline`",
  "`deployment_id` text NOT NULL",
  "`comparison_id` text NOT NULL",
  "`snapshot_comparison_id` text NOT NULL",
  "`actual_signature` text",
  "`expected_signature` text",
  "`captured_at` integer NOT NULL",
  "CREATE UNIQUE INDEX `workspace_scene_qa_baseline_workspace_deployment_comparison_idx`",
  "CREATE TABLE `workspace_notification_email_delivery`",
  "`dedupe_key` text NOT NULL",
  "`recipient_role` text NOT NULL",
  "`html_content` text NOT NULL",
  "`max_attempts` integer DEFAULT 3 NOT NULL",
  "CREATE UNIQUE INDEX `workspace_notification_email_delivery_dedupe_idx`",
  "CREATE TABLE `workspace_notification_email_delivery_attempt`",
  "`attempt_number` integer NOT NULL",
  "`provider_message_id` text",
  "CREATE INDEX `workspace_notification_email_delivery_attempt_delivery_idx`",
  "CREATE TABLE `workspace_release_calendar_milestone`",
  "`source_key` text NOT NULL",
  "`blocker_count` integer DEFAULT 0 NOT NULL",
  "`due_at` integer NOT NULL",
  "CREATE UNIQUE INDEX `workspace_release_calendar_milestone_workspace_source_idx`",
];

for (const fragment of requiredSqlFragments) {
  assert.ok(migrationSql.includes(fragment), `migration SQL is missing: ${fragment}`);
}

const requiredSnapshotTables = [
  "project",
  "project_artifact_registry_entry",
  "project_audit_event",
  "project_data_retention_policy",
  "project_health_notification_state",
  "project_template",
  "workspace",
  "workspace_invite",
  "workspace_member",
  "workspace_notification_delivery_preference",
  "workspace_notification_email_delivery",
  "workspace_notification_email_delivery_attempt",
  "workspace_release_calendar_milestone",
  "workspace_scene_qa_baseline",
];

for (const table of requiredSnapshotTables) {
  assert.ok(snapshot.tables?.[table], `migration snapshot is missing table: ${table}`);
}

assert.ok(journal.entries?.some((entry) => entry.tag?.startsWith("0000_")), "migration journal is missing the initial migration entry");

console.log("db migration coverage smoke passed");
