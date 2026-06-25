import { nanoid } from "nanoid";
import type { NewProjectRecord, ProjectTemplateRecord } from "@/db/schema";
import type { SceneDocument } from "@/features/editor/types";
import type { ShareSettings } from "@/features/projects/share-settings";

export interface CreateProjectFromTemplateDraftInput {
  folderId: string | null;
  name?: string | null;
  now?: Date;
  projectId?: string;
  sceneId?: string;
  userId: string;
}

export type ProjectTemplateProjectDraft = NewProjectRecord & {
  archivedAt: Date | null;
  description: string;
  folderId: string | null;
  publishedAt: Date | null;
  sceneData: SceneDocument;
  shareId: string | null;
  shareSettings: ShareSettings | null;
  workspaceId: string;
};

export function createProjectDraftFromTemplate(template: ProjectTemplateRecord, input: CreateProjectFromTemplateDraftInput): ProjectTemplateProjectDraft {
  const now = input.now ?? new Date();
  const name = input.name?.trim() || template.name;
  const sceneData: SceneDocument = {
    ...structuredClone(template.sceneData),
    id: input.sceneId ?? nanoid(),
    name,
    updatedAt: now.toISOString(),
  };

  return {
    archivedAt: null,
    createdAt: now,
    description: template.description,
    folderId: input.folderId,
    id: input.projectId ?? nanoid(),
    name,
    publishedAt: null,
    sceneData,
    shareId: null,
    shareSettings: template.shareSettings,
    updatedAt: now,
    userId: input.userId,
    workspaceId: template.workspaceId,
  };
}
