import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { ensureProjectAccessSchema } from "@/features/projects/server/project-access-service";

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

async function runOptionalSchemaStatement(statement: string) {
  try {
    await runSchemaStatement(statement);
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";

    if (!message.includes("duplicate column")) {
      throw error;
    }
  }
}

export async function ensureProjectTemplateSchema() {
  schemaReady ??= (async () => {
    await ensureProjectAccessSchema();
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS project_template (
        id text PRIMARY KEY NOT NULL,
        workspace_id text NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
        created_by_user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        source_project_id text REFERENCES project(id) ON DELETE SET NULL,
        name text NOT NULL,
        description text NOT NULL DEFAULT '',
        scene_data text NOT NULL,
        share_settings text,
        export_preset_id text NOT NULL,
        review_policy_preset_id text NOT NULL,
        folder_name text NOT NULL,
        use_count integer NOT NULL DEFAULT 0,
        last_used_at integer,
        last_used_by_user_id text REFERENCES user(id) ON DELETE SET NULL,
        last_used_project_id text REFERENCES project(id) ON DELETE SET NULL,
        version integer NOT NULL DEFAULT 1,
        version_history text NOT NULL DEFAULT '[]',
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `);
    await runOptionalSchemaStatement("ALTER TABLE project_template ADD COLUMN use_count integer NOT NULL DEFAULT 0");
    await runOptionalSchemaStatement("ALTER TABLE project_template ADD COLUMN last_used_at integer");
    await runOptionalSchemaStatement("ALTER TABLE project_template ADD COLUMN last_used_by_user_id text REFERENCES user(id) ON DELETE SET NULL");
    await runOptionalSchemaStatement("ALTER TABLE project_template ADD COLUMN last_used_project_id text REFERENCES project(id) ON DELETE SET NULL");
    await runOptionalSchemaStatement("ALTER TABLE project_template ADD COLUMN version integer NOT NULL DEFAULT 1");
    await runOptionalSchemaStatement("ALTER TABLE project_template ADD COLUMN version_history text NOT NULL DEFAULT '[]'");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_template_workspace_idx ON project_template(workspace_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_template_created_by_idx ON project_template(created_by_user_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_template_source_project_idx ON project_template(source_project_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_template_last_used_idx ON project_template(last_used_at)");
  })();

  await schemaReady;
}
