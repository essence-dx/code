import type { ProjectTemplateRecord } from "@/db/schema";
import { sceneDocumentSchema } from "@/features/editor/types";
import { normalizeProjectTemplateVersionHistory } from "@/features/projects/project-template-version-history";
import type { WorkspaceProjectTemplateSummary } from "@/features/projects/types";

function getObjectCount(sceneData: unknown) {
  const parsed = sceneDocumentSchema.safeParse(sceneData);

  return parsed.success ? parsed.data.objects.length : 0;
}

export function toWorkspaceProjectTemplateSummary(template: ProjectTemplateRecord): WorkspaceProjectTemplateSummary {
  return {
    createdAt: template.createdAt.toISOString(),
    description: template.description,
    exportPresetId: template.exportPresetId,
    folderName: template.folderName,
    id: template.id,
    lastUsedAt: template.lastUsedAt?.toISOString() ?? null,
    lastUsedByUserId: template.lastUsedByUserId,
    lastUsedProjectId: template.lastUsedProjectId,
    name: template.name,
    objectCount: getObjectCount(template.sceneData),
    reviewPolicyPresetId: template.reviewPolicyPresetId,
    sourceProjectId: template.sourceProjectId,
    updatedAt: template.updatedAt.toISOString(),
    useCount: template.useCount,
    version: template.version,
    versionHistory: normalizeProjectTemplateVersionHistory(template.versionHistory),
    workspaceId: template.workspaceId,
  };
}
