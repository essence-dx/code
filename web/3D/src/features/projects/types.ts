import type { SceneDocument, Vec3 } from "@/features/editor/types";
import type { ProjectAccessRole } from "./access-types";
import type { ProjectPresenceSummary } from "./presence-types";
import type { ProjectTemplateVersionEntry } from "@/db/schema";
import type { ProjectExportPresetId, ProjectReviewPolicyPresetId } from "./project-templates";
import type { ProjectHealthNotificationStateSummary } from "./project-health-notifications";
import type { ShareSettings } from "./share-settings";
import type { ProjectVersionActivityData } from "./version-activity-types";

export interface ProjectSummary {
  id: string;
  folderId: string | null;
  name: string;
  description: string;
  sceneData: SceneDocument;
  shareId: string | null;
  shareSettings: ShareSettings | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFolderSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectVersionSummary {
  id: string;
  projectId: string;
  name: string;
  sceneData: SceneDocument;
  activityData: ProjectVersionActivityData | null;
  createdAt: string;
}

export interface ProjectCommentSummary {
  id: string;
  projectId: string;
  objectId: string | null;
  body: string;
  position: Vec3;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAccessGrantSummary {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  email: string;
  role: ProjectAccessRole;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceProjectTemplateSummary {
  createdAt: string;
  description: string;
  exportPresetId: ProjectExportPresetId;
  folderName: string;
  id: string;
  lastUsedAt: string | null;
  lastUsedByUserId: string | null;
  lastUsedProjectId: string | null;
  name: string;
  objectCount: number;
  reviewPolicyPresetId: ProjectReviewPolicyPresetId;
  sourceProjectId: string | null;
  updatedAt: string;
  useCount: number;
  version: number;
  versionHistory: ProjectTemplateVersionEntry[];
  workspaceId: string;
}

export type ProjectAuditCategory = "comments" | "exports" | "permissions" | "publishing" | "releases" | "versions";

export type ProjectAuditStatus = "danger" | "info" | "success" | "warning";

export interface ProjectAuditEvent {
  action?: string;
  actorEmail?: string | null;
  actorName?: string | null;
  category: ProjectAuditCategory;
  description: string;
  id: string;
  metadata?: Record<string, boolean | number | string | null | undefined>;
  occurredAt: string;
  resourceId?: string | null;
  resourceType?: string;
  status: ProjectAuditStatus;
  tombstone?: Record<string, boolean | number | string | null> | null;
  title: string;
}

export type ProjectAuditLogSummary = Record<ProjectAuditCategory, number> & {
  total: number;
};

export interface ProjectAuditLog {
  events: ProjectAuditEvent[];
  summary: ProjectAuditLogSummary;
}

export interface ProjectFolderAccessGrantSummary {
  id: string;
  folderId: string;
  userId: string;
  name: string;
  email: string;
  role: ProjectAccessRole;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectsResponse {
  projects: ProjectSummary[];
}

export interface ProjectResponse {
  project: ProjectSummary;
}

export interface ProjectFoldersResponse {
  folders: ProjectFolderSummary[];
}

export interface ProjectFolderResponse {
  folder: ProjectFolderSummary;
}

export interface ProjectVersionsResponse {
  versions: ProjectVersionSummary[];
}

export interface ProjectCommentsResponse {
  comments: ProjectCommentSummary[];
}

export interface ProjectCommentResponse {
  comment: ProjectCommentSummary;
}

export interface ProjectAccessGrantsResponse {
  grants: ProjectAccessGrantSummary[];
}

export interface ProjectAccessGrantResponse {
  grant: ProjectAccessGrantSummary;
}

export interface WorkspaceProjectTemplatesResponse {
  templates: WorkspaceProjectTemplateSummary[];
}

export interface WorkspaceProjectTemplateResponse {
  template: WorkspaceProjectTemplateSummary;
}

export interface ProjectHealthNotificationStateResponse {
  state: ProjectHealthNotificationStateSummary;
}

export interface ProjectAuditLogResponse {
  auditLog: ProjectAuditLog;
}

export interface ProjectFolderAccessGrantsResponse {
  grants: ProjectFolderAccessGrantSummary[];
}

export interface ProjectFolderAccessGrantResponse {
  grant: ProjectFolderAccessGrantSummary;
}

export interface ProjectPresenceResponse {
  presence: ProjectPresenceSummary[];
}
