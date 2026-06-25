import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getProject,
  getProjectByEditShare,
  getProjectOwnerUserId,
  syncProject,
  syncProjectByEditShare,
  trashProject,
  updateProject,
  updateProjectByEditShare,
} from "@/db/projects";
import { createWorkspaceAuditLog } from "@/db/workspace-audit-logs";
import { parseDesignDocument } from "@/features/editor/document-codec";
import type { ProjectDetail } from "@/features/editor/types";
import {
  createNoStoreJsonHeaders,
  isValidEditShareId,
} from "@/features/security/public-access-security";
import { auth } from "@/lib/auth";

const updateProjectSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  document: z.unknown().optional(),
  thumbnail: z.string().nullable().optional(),
  editShareId: z.string().min(16).max(80).optional(),
  sync: z.boolean().optional(),
  baseUpdatedAt: z.string().optional(),
  operationId: z.string().min(8).max(180).optional(),
  operationKind: z.enum(["autosave-sync", "manual-save"]).optional(),
  clientRevision: z.number().int().min(0).max(1_000_000).optional(),
});

type ProjectRouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

async function getSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers,
  });
}

export async function GET(request: Request, context: ProjectRouteContext) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const { searchParams } = new URL(request.url);
  const editShareId = searchParams.get("editShareId");
  const project = editShareId
    ? isValidEditShareId(editShareId)
      ? await getProjectByEditShare(editShareId)
      : null
    : await getProject({ userId: session.user.id, projectId });

  if (!project || project.id !== projectId) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: createNoStoreJsonHeaders() },
    );
  }

  return NextResponse.json({ project });
}

export async function PATCH(request: Request, context: ProjectRouteContext) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const body = updateProjectSchema.parse(await request.json());

  if (body.editShareId && !isValidEditShareId(body.editShareId)) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: createNoStoreJsonHeaders() },
    );
  }

  const document = body.document
    ? parseDesignDocument(body.document)
    : undefined;

  if (body.sync) {
    if (!document) {
      return NextResponse.json(
        { error: "Document is required" },
        { status: 400 },
      );
    }

    const result = body.editShareId
      ? await syncProjectByEditShare({
          projectId,
          editShareId: body.editShareId,
          baseUpdatedAt: body.baseUpdatedAt ?? null,
          name: body.name,
          document,
        })
      : await syncProject({
          userId: session.user.id,
          projectId,
          baseUpdatedAt: body.baseUpdatedAt ?? null,
          name: body.name,
          document,
        });

    if (result.status === "conflict") {
      await createCollaborationOperationAuditLog({
        actorUserId: session.user.id,
        projectId,
        fallbackOwnerUserId: session.user.id,
        operationId: body.operationId,
        operationKind: body.operationKind ?? "autosave-sync",
        clientRevision: body.clientRevision,
        baseUpdatedAt: body.baseUpdatedAt ?? null,
        remoteUpdatedAt: result.project.updatedAt,
        status: "conflict",
        project: result.project,
        actorName: session.user.name || session.user.email || "Collaborator",
      });

      return NextResponse.json(
        { error: "Conflict", project: result.project },
        { status: 409 },
      );
    }

    if (result.status === "missing") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await createCollaborationOperationAuditLog({
      actorUserId: session.user.id,
      projectId,
      fallbackOwnerUserId: session.user.id,
      operationId: body.operationId,
      operationKind: body.operationKind ?? "autosave-sync",
      clientRevision: body.clientRevision,
      baseUpdatedAt: body.baseUpdatedAt ?? null,
      remoteUpdatedAt: result.project.updatedAt,
      status: "merged",
      project: result.project,
      actorName: session.user.name || session.user.email || "Collaborator",
    });

    return NextResponse.json({ project: result.project });
  }

  const project = body.editShareId
    ? await updateProjectByEditShare({
        projectId,
        editShareId: body.editShareId,
        name: body.name,
        document,
        thumbnail: body.thumbnail,
      })
    : await updateProject({
        userId: session.user.id,
        projectId,
        name: body.name,
        document,
        thumbnail: body.thumbnail,
      });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (document) {
    await createCollaborationOperationAuditLog({
      actorUserId: session.user.id,
      projectId,
      fallbackOwnerUserId: session.user.id,
      operationId: body.operationId,
      operationKind: body.operationKind ?? "manual-save",
      clientRevision: body.clientRevision,
      baseUpdatedAt: null,
      remoteUpdatedAt: project.updatedAt,
      status: "merged",
      project,
      actorName: session.user.name || session.user.email || "Collaborator",
    });
  }

  return NextResponse.json({ project });
}

export async function DELETE(request: Request, context: ProjectRouteContext) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  await trashProject({ userId: session.user.id, projectId });

  return NextResponse.json({ ok: true });
}

async function createCollaborationOperationAuditLog(input: {
  actorUserId: string;
  projectId: string;
  fallbackOwnerUserId: string;
  operationId?: string;
  operationKind: "autosave-sync" | "manual-save";
  clientRevision?: number;
  baseUpdatedAt: string | null;
  remoteUpdatedAt: string;
  status: "merged" | "conflict";
  project: ProjectDetail;
  actorName: string;
}) {
  const ownerUserId =
    (await getProjectOwnerUserId(input.projectId)) ?? input.fallbackOwnerUserId;
  const operationId =
    input.operationId ??
    `${input.operationKind}-${input.projectId}-${input.clientRevision ?? 0}`;
  const action =
    input.status === "merged"
      ? "collaboration.operation.merged"
      : "collaboration.operation.conflicted";

  await createWorkspaceAuditLog({
    userId: ownerUserId,
    actorUserId: input.actorUserId,
    action,
    targetType: "project",
    targetId: input.projectId,
    summary:
      input.status === "merged"
        ? `Merged ${input.operationKind} for ${input.project.name}.`
        : `Held stale ${input.operationKind} for ${input.project.name}.`,
    metadata: {
      projectId: input.projectId,
      operationId,
      operationKind: input.operationKind,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      baseUpdatedAt: input.baseUpdatedAt,
      remoteUpdatedAt: input.remoteUpdatedAt,
      mergedAt: input.status === "merged" ? input.remoteUpdatedAt : null,
      clientRevision: input.clientRevision ?? null,
    },
  });
}
