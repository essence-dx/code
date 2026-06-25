import { and, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { project, projectFolder, projectTemplate, type ProjectRecord, type ProjectTemplateRecord } from "@/db/schema";
import { sceneDocumentSchema, type SceneDocument } from "@/features/editor/types";
import {
  createProjectTemplatePayload,
  projectExportPresetIds,
  projectReviewPolicyPresetIds,
  type ProjectExportPresetId,
  type ProjectReviewPolicyPresetId,
} from "@/features/projects/project-templates";
import { createProjectDraftFromTemplate } from "@/features/projects/project-template-project";
import { appendProjectTemplateVersionHistory, createProjectTemplateVersionEntry } from "@/features/projects/project-template-version-history";
import { toWorkspaceProjectTemplateSummary } from "@/features/projects/project-template-summary";
import { recordProjectAuditEvent } from "@/features/projects/server/project-audit-event-service";
import { requireProjectRole } from "@/features/projects/server/project-access-service";
import { ensureProjectTemplateSchema } from "@/features/projects/server/project-template-schema";
import type { WorkspaceProjectTemplateSummary } from "@/features/projects/types";
import { getWorkspaceAccess } from "@/features/workspaces/server/workspace-service";

type ServiceResult<T> = T | { error: string; status: number };

function isWritableWorkspaceRole(role: string) {
  return role !== "viewer";
}

function getPreset<T extends string>(value: string | null | undefined, values: readonly T[], fallback: T) {
  return values.find((entry) => entry === value) ?? fallback;
}

async function requireWorkspaceWrite(workspaceId: string, currentUserId: string): Promise<ServiceResult<{ role: string }>> {
  const access = await getWorkspaceAccess(workspaceId, currentUserId);

  if (!access) {
    return { error: "Workspace not found", status: 404 };
  }

  if (!isWritableWorkspaceRole(access.role)) {
    return { error: "Insufficient workspace permission", status: 403 };
  }

  return access;
}

async function requireWorkspaceRead(workspaceId: string, currentUserId: string): Promise<ServiceResult<{ role: string }>> {
  const access = await getWorkspaceAccess(workspaceId, currentUserId);

  return access ?? { error: "Workspace not found", status: 404 };
}

async function loadTemplate(templateId: string) {
  await ensureProjectTemplateSchema();

  return (
    await getDb()
      .select()
      .from(projectTemplate)
      .where(eq(projectTemplate.id, templateId))
      .limit(1)
  )[0] ?? null;
}

async function loadWritableTemplate(templateId: string, currentUserId: string): Promise<ServiceResult<ProjectTemplateRecord>> {
  const template = await loadTemplate(templateId);

  if (!template) {
    return { error: "Template not found", status: 404 };
  }

  const access = await requireWorkspaceWrite(template.workspaceId, currentUserId);

  if ("error" in access) {
    return access;
  }

  return template;
}

async function loadReadableTemplate(templateId: string, currentUserId: string): Promise<ServiceResult<ProjectTemplateRecord>> {
  const template = await loadTemplate(templateId);

  if (!template) {
    return { error: "Template not found", status: 404 };
  }

  const access = await requireWorkspaceRead(template.workspaceId, currentUserId);

  if ("error" in access) {
    return access;
  }

  return template;
}

async function ensureWorkspaceFolder(input: { currentUserId: string; folderName: string; workspaceId: string }) {
  const folderName = input.folderName.trim();

  if (!folderName) {
    return null;
  }

  const existingFolder = (
    await getDb()
      .select({ id: projectFolder.id })
      .from(projectFolder)
      .where(and(eq(projectFolder.userId, input.currentUserId), eq(projectFolder.workspaceId, input.workspaceId), eq(projectFolder.name, folderName)))
      .limit(1)
  )[0];

  if (existingFolder) {
    return existingFolder.id;
  }

  const now = new Date();
  const folder = {
    createdAt: now,
    id: nanoid(),
    name: folderName,
    updatedAt: now,
    userId: input.currentUserId,
    workspaceId: input.workspaceId,
  };

  await getDb().insert(projectFolder).values(folder);

  return folder.id;
}

function parseProjectScene(source: ProjectRecord): ServiceResult<SceneDocument> {
  const parsed = sceneDocumentSchema.safeParse(source.sceneData);

  if (!parsed.success) {
    return { error: "Source project scene data is invalid", status: 409 };
  }

  return parsed.data;
}

export async function listWorkspaceProjectTemplates(input: { currentUserId: string; workspaceId: string }): Promise<ServiceResult<{ templates: WorkspaceProjectTemplateSummary[] }>> {
  await ensureProjectTemplateSchema();

  const access = await requireWorkspaceRead(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const templates = await getDb()
    .select()
    .from(projectTemplate)
    .where(eq(projectTemplate.workspaceId, input.workspaceId))
    .orderBy(desc(projectTemplate.updatedAt));

  return { templates: templates.map(toWorkspaceProjectTemplateSummary) };
}

export async function createWorkspaceProjectTemplate(input: {
  baseTemplateId?: string | null;
  currentUserId: string;
  description?: string | null;
  exportPresetId?: string | null;
  folderName?: string | null;
  name: string;
  reviewPolicyPresetId?: string | null;
  sourceProjectId?: string | null;
  workspaceId: string;
}): Promise<ServiceResult<{ template: WorkspaceProjectTemplateSummary }>> {
  await ensureProjectTemplateSchema();

  const access = await requireWorkspaceWrite(input.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const now = new Date();
  let sourceProjectId: string | null = null;
  let sceneData: SceneDocument;
  let description = input.description?.trim() ?? "";
  let folderName = input.folderName?.trim() || "Workspace Templates";
  let exportPresetId = getPreset(input.exportPresetId, projectExportPresetIds, "full-package");
  let reviewPolicyPresetId = getPreset(input.reviewPolicyPresetId, projectReviewPolicyPresetIds, "open");
  let shareSettings = createProjectTemplatePayload({
    exportPresetId,
    name: input.name,
    reviewPolicyPresetId,
    templateId: input.baseTemplateId,
  }).shareSettings;

  if (input.sourceProjectId) {
    const sourceAccess = await requireProjectRole(input.sourceProjectId, input.currentUserId, "viewer");

    if ("error" in sourceAccess) {
      return sourceAccess;
    }

    if (sourceAccess.project.workspaceId !== input.workspaceId) {
      return { error: "Source project must belong to this workspace", status: 400 };
    }

    const parsedScene = parseProjectScene(sourceAccess.project);

    if ("error" in parsedScene) {
      return parsedScene;
    }

    sourceProjectId = sourceAccess.project.id;
    sceneData = parsedScene;
    description ||= sourceAccess.project.description || `${sourceAccess.project.name} reusable workspace template.`;
    shareSettings = sourceAccess.project.shareSettings ?? shareSettings;
  } else {
    const payload = createProjectTemplatePayload({
      exportPresetId,
      name: input.name,
      reviewPolicyPresetId,
      templateId: input.baseTemplateId,
    });

    sceneData = payload.sceneData;
    description ||= payload.description;
    exportPresetId = payload.template.exportPresetId;
    reviewPolicyPresetId = payload.template.reviewPolicyPresetId;
    folderName = input.folderName?.trim() || payload.template.workspaceDefaults.folderName;
    shareSettings = payload.shareSettings;
  }

  const row = {
    createdAt: now,
    createdByUserId: input.currentUserId,
    description,
    exportPresetId: exportPresetId as ProjectExportPresetId,
    folderName,
    id: nanoid(),
    name: input.name.trim(),
    reviewPolicyPresetId: reviewPolicyPresetId as ProjectReviewPolicyPresetId,
    sceneData,
    shareSettings,
    sourceProjectId,
    updatedAt: now,
    useCount: 0,
    lastUsedAt: null,
    lastUsedByUserId: null,
    lastUsedProjectId: null,
    version: 1,
    versionHistory: [
      createProjectTemplateVersionEntry({
        action: "created",
        actorUserId: input.currentUserId,
        at: now,
        sourceProjectId,
        version: 1,
      }),
    ],
    workspaceId: input.workspaceId,
  };

  await getDb().insert(projectTemplate).values(row);

  return { template: toWorkspaceProjectTemplateSummary(row) };
}

export async function cloneWorkspaceProjectTemplate(input: { currentUserId: string; templateId: string }): Promise<ServiceResult<{ template: WorkspaceProjectTemplateSummary }>> {
  const template = await loadWritableTemplate(input.templateId, input.currentUserId);

  if ("error" in template) {
    return template;
  }

  const now = new Date();
  const row = {
    ...template,
    createdAt: now,
    createdByUserId: input.currentUserId,
    id: nanoid(),
    lastUsedAt: null,
    lastUsedByUserId: null,
    lastUsedProjectId: null,
    name: `${template.name.slice(0, 70)} Copy`,
    updatedAt: now,
    useCount: 0,
    version: 1,
    versionHistory: [
      createProjectTemplateVersionEntry({
        action: "cloned",
        actorUserId: input.currentUserId,
        at: now,
        sourceProjectId: template.sourceProjectId,
        sourceTemplateId: template.id,
        version: 1,
      }),
    ],
  };

  await getDb().insert(projectTemplate).values(row);

  return { template: toWorkspaceProjectTemplateSummary(row) };
}

export async function updateWorkspaceProjectTemplate(input: {
  currentUserId: string;
  description?: string;
  folderName?: string;
  name?: string;
  sourceProjectId?: string | null;
  templateId: string;
}): Promise<ServiceResult<{ template: WorkspaceProjectTemplateSummary }>> {
  const template = await loadWritableTemplate(input.templateId, input.currentUserId);

  if ("error" in template) {
    return template;
  }

  let sourceProjectId = template.sourceProjectId;
  let sceneData = template.sceneData;
  let shareSettings = template.shareSettings;
  const now = new Date();
  const nextVersion = template.version + 1;
  let versionAction: "refreshed" | "updated" = "updated";

  if (input.sourceProjectId) {
    const sourceAccess = await requireProjectRole(input.sourceProjectId, input.currentUserId, "viewer");

    if ("error" in sourceAccess) {
      return sourceAccess;
    }

    if (sourceAccess.project.workspaceId !== template.workspaceId) {
      return { error: "Source project must belong to this workspace", status: 400 };
    }

    const parsedScene = parseProjectScene(sourceAccess.project);

    if ("error" in parsedScene) {
      return parsedScene;
    }

    sourceProjectId = sourceAccess.project.id;
    sceneData = parsedScene;
    shareSettings = sourceAccess.project.shareSettings ?? shareSettings;
    versionAction = "refreshed";
  }

  const rows = await getDb()
    .update(projectTemplate)
    .set({
      description: input.description?.trim() ?? template.description,
      folderName: input.folderName?.trim() || template.folderName,
      name: input.name?.trim() || template.name,
      sceneData,
      shareSettings,
      sourceProjectId,
      updatedAt: now,
      version: nextVersion,
      versionHistory: appendProjectTemplateVersionHistory(
        template.versionHistory,
        createProjectTemplateVersionEntry({
          action: versionAction,
          actorUserId: input.currentUserId,
          at: now,
          sourceProjectId,
          version: nextVersion,
        }),
      ),
    })
    .where(eq(projectTemplate.id, template.id))
    .returning();

  return rows[0] ? { template: toWorkspaceProjectTemplateSummary(rows[0]) } : { error: "Template not found", status: 404 };
}

export async function deleteWorkspaceProjectTemplate(input: { currentUserId: string; templateId: string }): Promise<ServiceResult<{ deletedTemplateId: string }>> {
  const template = await loadWritableTemplate(input.templateId, input.currentUserId);

  if ("error" in template) {
    return template;
  }

  const rows = await getDb().delete(projectTemplate).where(eq(projectTemplate.id, template.id)).returning({ id: projectTemplate.id });

  return rows[0] ? { deletedTemplateId: rows[0].id } : { error: "Template not found", status: 404 };
}

export async function createProjectFromWorkspaceTemplate(input: {
  currentUserId: string;
  name?: string | null;
  templateId: string;
}): Promise<ServiceResult<{ project: ProjectRecord }>> {
  const template = await loadReadableTemplate(input.templateId, input.currentUserId);

  if ("error" in template) {
    return template;
  }

  const access = await requireWorkspaceWrite(template.workspaceId, input.currentUserId);

  if ("error" in access) {
    return access;
  }

  const folderId = await ensureWorkspaceFolder({
    currentUserId: input.currentUserId,
    folderName: template.folderName,
    workspaceId: template.workspaceId,
  });
  const projectRow = createProjectDraftFromTemplate(template, {
    folderId,
    name: input.name,
    userId: input.currentUserId,
  });

  await getDb().insert(project).values(projectRow);
  await getDb()
    .update(projectTemplate)
    .set({
      lastUsedAt: projectRow.createdAt,
      lastUsedByUserId: input.currentUserId,
      lastUsedProjectId: projectRow.id,
      useCount: sql`${projectTemplate.useCount} + 1`,
    })
    .where(eq(projectTemplate.id, template.id));
  await recordProjectAuditEvent({
    action: "project.created_from_template",
    actorUserId: input.currentUserId,
    category: "publishing",
    createdAt: projectRow.createdAt,
    metadata: {
      sourceProjectId: template.sourceProjectId,
      templateId: template.id,
    },
    projectId: projectRow.id,
    resourceId: projectRow.id,
    resourceType: "project",
    summary: `${projectRow.name} was created from ${template.name}.`,
  });

  return { project: projectRow };
}
