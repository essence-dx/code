import type { SceneDocument } from "@/features/editor/types";
import type { SceneCollaborationOperation } from "@/features/editor/scene/scene-collaboration-operations";
import { encodeProjectCollaborationClientCursors, type ProjectCollaborationClientCursor } from "./collaboration-client-cursors";
import { isProjectCollaborationClientSequenceRecovery } from "./collaboration-client-sequence-continuity";
import type { ProjectCollaborationOperationBatchResponse, ProjectCollaborationOperationsResponse } from "./collaboration-types";
import type { ShareSettings } from "./share-settings";
import type {
  ProjectAccessGrantResponse,
  ProjectAccessGrantsResponse,
  ProjectAuditLogResponse,
  ProjectFolderAccessGrantResponse,
  ProjectFolderAccessGrantsResponse,
  ProjectCommentResponse,
  ProjectCommentsResponse,
  ProjectFolderResponse,
  ProjectHealthNotificationStateResponse,
  ProjectPresenceResponse,
  ProjectFoldersResponse,
  ProjectResponse,
  ProjectSummary,
  ProjectVersionsResponse,
  ProjectsResponse,
  WorkspaceProjectTemplateResponse,
  WorkspaceProjectTemplatesResponse,
} from "./types";
import type { ProjectAccessRole } from "./access-types";
import type { ProjectPresenceCursor } from "./presence-types";
import type { ProjectArtifactRegistryReport } from "./project-artifact-registry";
import type {
  ProjectDataRetentionPolicySettings,
  ProjectDataRetentionPurgeManifest,
  ProjectDataRetentionPurgeReviewStatus,
  ProjectDataRetentionReport,
} from "./project-data-retention";

export class ProjectApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload: unknown,
  ) {
    super(message);
    this.name = "ProjectApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getProjectConflictPayload(error: unknown) {
  if (!(error instanceof ProjectApiError) || error.status !== 409 || !isRecord(error.payload)) {
    return null;
  }

  const latestUpdatedAt = typeof error.payload.latestUpdatedAt === "string" ? error.payload.latestUpdatedAt : null;

  if (!latestUpdatedAt) {
    return null;
  }

  return {
    latestUpdatedAt,
    project: isRecord(error.payload.project) ? (error.payload.project as unknown as ProjectSummary) : null,
  };
}

export function getProjectCollaborationClientSequenceRecovery(error: unknown) {
  if (!(error instanceof ProjectApiError) || error.status !== 409 || !isRecord(error.payload)) {
    return null;
  }

  return isProjectCollaborationClientSequenceRecovery(error.payload.clientSequenceRecovery) ? error.payload.clientSequenceRecovery : null;
}

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error : "Project request failed";
    throw new ProjectApiError(message, response.status, payload);
  }

  return payload as T;
}

export async function listProjects(workspaceId?: string | null) {
  const path = workspaceId ? `/api/projects?workspaceId=${encodeURIComponent(workspaceId)}` : "/api/projects";
  const response = await fetch(path, {
    method: "GET",
    credentials: "include",
  });

  return parseJson<ProjectsResponse>(response);
}

export async function createProject(input: {
  description?: string;
  exportPresetId?: string | null;
  folderId?: string | null;
  name: string;
  reviewPolicyPresetId?: string | null;
  sceneData?: SceneDocument;
  templateId?: string | null;
  workspaceId?: string | null;
}) {
  const response = await fetch("/api/projects", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJson<ProjectResponse>(response);
}

export async function getProject(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: "GET",
    credentials: "include",
  });

  return parseJson<ProjectResponse>(response);
}

export async function updateProject(
  projectId: string,
  input: { expectedUpdatedAt?: string | null; name?: string; description?: string; folderId?: string | null; sceneData?: SceneDocument; shareSettings?: ShareSettings },
) {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJson<ProjectResponse>(response);
}

export async function listProjectPresence(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/presence`, {
    method: "GET",
    credentials: "include",
  });

  return parseJson<ProjectPresenceResponse>(response);
}

export async function heartbeatProjectPresence(projectId: string, input: { cursor?: ProjectPresenceCursor | null; selectedObjectId?: string | null }) {
  const response = await fetch(`/api/projects/${projectId}/presence`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJson<{ ok: boolean }>(response);
}

export async function listProjectCollaborationOperationBatches(projectId: string, after?: string | null, clientCursors?: ProjectCollaborationClientCursor[]) {
  const params = new URLSearchParams();

  if (after) {
    params.set("after", after);
  }

  if (clientCursors?.length) {
    params.set("clientCursors", encodeProjectCollaborationClientCursors(clientCursors));
  }

  const query = params.toString();
  const path = `/api/projects/${projectId}/collaboration/operations${query ? `?${query}` : ""}`;
  const response = await fetch(path, {
    method: "GET",
    credentials: "include",
  });

  return parseJson<ProjectCollaborationOperationsResponse>(response);
}

export async function createProjectCollaborationOperationBatch(
  projectId: string,
  input: {
    baseUpdatedAt?: string | null;
    batchId?: string;
    causalId?: string;
    clientId: string;
    clientSequence?: number;
    operations: SceneCollaborationOperation[];
    requestId?: string;
  },
) {
  const response = await fetch(`/api/projects/${projectId}/collaboration/operations`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJson<ProjectCollaborationOperationBatchResponse>(response);
}

export async function duplicateProject(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/duplicate`, {
    method: "POST",
    credentials: "include",
  });

  return parseJson<ProjectResponse>(response);
}

export async function archiveProject(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/archive`, {
    method: "POST",
    credentials: "include",
  });

  return parseJson<ProjectResponse>(response);
}

export async function restoreProject(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/restore`, {
    method: "POST",
    credentials: "include",
  });

  return parseJson<ProjectResponse>(response);
}

export async function publishProject(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/share`, {
    method: "POST",
    credentials: "include",
  });

  return parseJson<ProjectResponse>(response);
}

export async function unpublishProject(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/share`, {
    method: "DELETE",
    credentials: "include",
  });

  return parseJson<ProjectResponse>(response);
}

export async function deleteProject(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: "DELETE",
    credentials: "include",
  });

  return parseJson<{ deletedProjectId: string }>(response);
}

export async function updateProjectHealthNotificationState(input: {
  action: "dismiss" | "read" | "restore" | "snooze";
  notificationId: string;
  projectId: string;
  snoozedUntil?: string | null;
}) {
  const response = await fetch("/api/project-health-notifications/state", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJson<ProjectHealthNotificationStateResponse>(response);
}

export async function listProjectVersions(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/versions`, {
    method: "GET",
    credentials: "include",
  });

  return parseJson<ProjectVersionsResponse>(response);
}

export async function restoreProjectVersion(projectId: string, versionId: string) {
  const response = await fetch(`/api/projects/${projectId}/versions`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ versionId }),
  });

  return parseJson<ProjectResponse>(response);
}

export async function listProjectComments(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/comments`, {
    method: "GET",
    credentials: "include",
  });

  return parseJson<ProjectCommentsResponse>(response);
}

export async function createProjectComment(projectId: string, input: { body: string; objectId?: string | null; position: [number, number, number] }) {
  const response = await fetch(`/api/projects/${projectId}/comments`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJson<ProjectCommentResponse>(response);
}

export async function updateProjectComment(projectId: string, commentId: string, input: { resolved: boolean }) {
  const response = await fetch(`/api/projects/${projectId}/comments/${commentId}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJson<ProjectCommentResponse>(response);
}

export async function deleteProjectComment(projectId: string, commentId: string) {
  const response = await fetch(`/api/projects/${projectId}/comments/${commentId}`, {
    method: "DELETE",
    credentials: "include",
  });

  return parseJson<{ deletedCommentId: string }>(response);
}

export async function listProjectAccessGrants(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/access`, {
    method: "GET",
    credentials: "include",
  });

  return parseJson<ProjectAccessGrantsResponse>(response);
}

export async function getProjectAuditLog(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/audit`, {
    method: "GET",
    credentials: "include",
  });

  return parseJson<ProjectAuditLogResponse>(response);
}

export async function getProjectDataRetentionReport(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/retention`, {
    method: "GET",
    credentials: "include",
  });

  return parseJson<{ report: ProjectDataRetentionReport }>(response);
}

export async function saveProjectDataRetentionPolicy(projectId: string, input: ProjectDataRetentionPolicySettings) {
  const response = await fetch(`/api/projects/${projectId}/retention`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJson<{ report: ProjectDataRetentionReport }>(response);
}

export async function getProjectArtifactRegistryReport(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/artifact-registry`, {
    method: "GET",
    credentials: "include",
  });

  return parseJson<{ report: ProjectArtifactRegistryReport }>(response);
}

export async function getProjectDataRetentionPurgeManifest(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}/retention/purge`, {
    method: "GET",
    credentials: "include",
  });

  return parseJson<{ manifest: ProjectDataRetentionPurgeManifest }>(response);
}

export async function updateProjectDataRetentionPurgeReview(
  projectId: string,
  input: { note?: string | null; status: ProjectDataRetentionPurgeReviewStatus },
) {
  const response = await fetch(`/api/projects/${projectId}/retention/purge`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJson<{ manifest: ProjectDataRetentionPurgeManifest }>(response);
}

export async function upsertProjectAccessGrant(projectId: string, input: { userId: string; role: ProjectAccessRole }) {
  const response = await fetch(`/api/projects/${projectId}/access`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJson<ProjectAccessGrantResponse>(response);
}

export async function revokeProjectAccessGrant(projectId: string, grantId: string) {
  const response = await fetch(`/api/projects/${projectId}/access/${grantId}`, {
    method: "DELETE",
    credentials: "include",
  });

  return parseJson<{ deletedGrantId: string }>(response);
}

export async function listFolderAccessGrants(folderId: string) {
  const response = await fetch(`/api/project-folders/${folderId}/access`, {
    method: "GET",
    credentials: "include",
  });

  return parseJson<ProjectFolderAccessGrantsResponse>(response);
}

export async function upsertFolderAccessGrant(folderId: string, input: { userId: string; role: ProjectAccessRole }) {
  const response = await fetch(`/api/project-folders/${folderId}/access`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJson<ProjectFolderAccessGrantResponse>(response);
}

export async function revokeFolderAccessGrant(folderId: string, grantId: string) {
  const response = await fetch(`/api/project-folders/${folderId}/access/${grantId}`, {
    method: "DELETE",
    credentials: "include",
  });

  return parseJson<{ deletedGrantId: string }>(response);
}

export async function listProjectFolders(workspaceId?: string | null) {
  const path = workspaceId ? `/api/project-folders?workspaceId=${encodeURIComponent(workspaceId)}` : "/api/project-folders";
  const response = await fetch(path, {
    method: "GET",
    credentials: "include",
  });

  return parseJson<ProjectFoldersResponse>(response);
}

export async function createProjectFolder(input: { name: string; workspaceId?: string | null }) {
  const response = await fetch("/api/project-folders", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJson<ProjectFolderResponse>(response);
}

export async function renameProjectFolder(folderId: string, input: { name: string }) {
  const response = await fetch(`/api/project-folders/${folderId}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJson<ProjectFolderResponse>(response);
}

export async function deleteProjectFolder(folderId: string) {
  const response = await fetch(`/api/project-folders/${folderId}`, {
    method: "DELETE",
    credentials: "include",
  });

  return parseJson<{ deletedFolderId: string }>(response);
}

export async function listWorkspaceProjectTemplates(workspaceId: string) {
  const response = await fetch(`/api/project-templates?workspaceId=${encodeURIComponent(workspaceId)}`, {
    method: "GET",
    credentials: "include",
  });

  return parseJson<WorkspaceProjectTemplatesResponse>(response);
}

export async function createWorkspaceProjectTemplate(input: {
  baseTemplateId?: string | null;
  description?: string | null;
  exportPresetId?: string | null;
  folderName?: string | null;
  name: string;
  reviewPolicyPresetId?: string | null;
  sourceProjectId?: string | null;
  workspaceId: string;
}) {
  const response = await fetch("/api/project-templates", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJson<WorkspaceProjectTemplateResponse>(response);
}

export async function updateWorkspaceProjectTemplate(
  templateId: string,
  input: {
    description?: string;
    folderName?: string;
    name?: string;
    sourceProjectId?: string | null;
  },
) {
  const response = await fetch(`/api/project-templates/${templateId}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJson<WorkspaceProjectTemplateResponse>(response);
}

export async function cloneWorkspaceProjectTemplate(templateId: string) {
  const response = await fetch(`/api/project-templates/${templateId}/clone`, {
    method: "POST",
    credentials: "include",
  });

  return parseJson<WorkspaceProjectTemplateResponse>(response);
}

export async function createProjectFromWorkspaceTemplate(templateId: string, input: { name?: string | null }) {
  const response = await fetch(`/api/project-templates/${templateId}/projects`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJson<ProjectResponse>(response);
}

export async function deleteWorkspaceProjectTemplate(templateId: string) {
  const response = await fetch(`/api/project-templates/${templateId}`, {
    method: "DELETE",
    credentials: "include",
  });

  return parseJson<{ deletedTemplateId: string }>(response);
}
