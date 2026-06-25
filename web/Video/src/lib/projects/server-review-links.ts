import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { hostedReviewComments, hostedReviewLinks, projects } from "@/lib/db/schema";
import {
  canHostedReviewComment,
  createHostedReviewCommentInputSchema,
  createHostedReviewLinkInputSchema,
  hostedReviewExpiry,
  hostedReviewLinkUrl,
  isHostedReviewExpired,
  updateHostedReviewLinkInputSchema,
  type HostedReviewComment,
  type HostedReviewLinkPublic,
  type HostedReviewLinkSummary,
} from "@/lib/projects/hosted-review-link-contracts";
import { ProjectAccessError, ProjectAuthError, requireProjectUser } from "@/lib/projects/server-projects";

export async function listHostedReviewLinks(origin: string): Promise<HostedReviewLinkSummary[]> {
  const { userId } = await requireProjectUser();
  const rows = await getDb()
    .select()
    .from(hostedReviewLinks)
    .where(eq(hostedReviewLinks.ownerId, userId))
    .orderBy(desc(hostedReviewLinks.updatedAt));

  return rows.map((row) => hostedReviewSummary(row, origin));
}

export async function createHostedReviewLink(input: unknown, origin: string): Promise<HostedReviewLinkSummary> {
  const { userId } = await requireProjectUser();
  const payload = createHostedReviewLinkInputSchema.parse(input);
  const db = getDb();
  const [project] = await db
    .select({
      id: projects.id,
      ownerId: projects.ownerId,
      title: projects.title,
    })
    .from(projects)
    .where(and(eq(projects.id, payload.projectId), eq(projects.ownerId, userId)))
    .limit(1);

  if (!project) {
    throw new ProjectAccessError();
  }

  const now = new Date();
  const [link] = await db
    .insert(hostedReviewLinks)
    .values({
      id: `hosted_review_${crypto.randomUUID()}`,
      projectId: project.id,
      ownerId: userId,
      token: crypto.randomUUID(),
      permission: payload.permission,
      enabled: true,
      expiresAt: hostedReviewExpiry(payload.expiresInDays, now),
      title: project.title,
      exportName: payload.exportName,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return hostedReviewSummary(link, origin);
}

export async function updateHostedReviewLink(input: unknown, origin: string): Promise<HostedReviewLinkSummary> {
  const { userId } = await requireProjectUser();
  const payload = updateHostedReviewLinkInputSchema.parse(input);
  const db = getDb();
  const [existing] = await db
    .select()
    .from(hostedReviewLinks)
    .where(and(eq(hostedReviewLinks.id, payload.id), eq(hostedReviewLinks.ownerId, userId)))
    .limit(1);

  if (!existing) {
    throw new ProjectAccessError();
  }

  const now = new Date();
  const [link] = await db
    .update(hostedReviewLinks)
    .set({
      permission: payload.permission ?? existing.permission,
      enabled: payload.enabled ?? existing.enabled,
      expiresAt: payload.expiresInDays ? hostedReviewExpiry(payload.expiresInDays, now) : existing.expiresAt,
      updatedAt: now,
    })
    .where(and(eq(hostedReviewLinks.id, existing.id), eq(hostedReviewLinks.ownerId, userId)))
    .returning();

  return hostedReviewSummary(link, origin);
}

export async function getPublicHostedReviewLink(token: string): Promise<HostedReviewLinkPublic | null> {
  const [row] = await getDb().select().from(hostedReviewLinks).where(eq(hostedReviewLinks.token, token)).limit(1);
  if (!row) return null;

  return {
    token: row.token,
    title: row.title,
    permission: row.permission,
    enabled: row.enabled,
    expired: isHostedReviewExpired(row.expiresAt),
    exportName: row.exportName,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listHostedReviewComments(token: string): Promise<HostedReviewComment[]> {
  const link = await getHostedReviewLinkRow(token);
  if (!link) {
    throw new HostedReviewLinkNotFoundError();
  }

  const rows = await getDb()
    .select()
    .from(hostedReviewComments)
    .where(eq(hostedReviewComments.linkId, link.id))
    .orderBy(asc(hostedReviewComments.createdAt));

  return rows.map(hostedReviewCommentSummary);
}

export async function createHostedReviewComment(token: string, input: unknown): Promise<HostedReviewComment> {
  const link = await getHostedReviewLinkRow(token);
  if (!link) {
    throw new HostedReviewLinkNotFoundError();
  }

  if (!link.enabled || isHostedReviewExpired(link.expiresAt)) {
    throw new HostedReviewLinkUnavailableError();
  }

  if (!canHostedReviewComment(link.permission)) {
    throw new HostedReviewCommentPermissionError();
  }

  const payload = createHostedReviewCommentInputSchema.parse(input);
  const now = new Date();
  const [comment] = await getDb()
    .insert(hostedReviewComments)
    .values({
      id: `hosted_comment_${crypto.randomUUID()}`,
      linkId: link.id,
      projectId: link.projectId,
      reviewerName: payload.reviewerName,
      reviewerEmail: payload.reviewerEmail,
      body: payload.body,
      time: payload.time,
      anchorLabel: payload.anchorLabel,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return hostedReviewCommentSummary(comment);
}

export function hostedReviewErrorResponse(error: unknown) {
  if (error instanceof ProjectAuthError) {
    return { body: { ok: false, reason: "You must be signed in to create hosted review links." }, status: 401 };
  }

  if (error instanceof ProjectAccessError) {
    return { body: { ok: false, reason: "Sync this project before creating a hosted review link." }, status: 404 };
  }

  return { body: { ok: false, reason: "Hosted review link could not be prepared." }, status: 500 };
}

export function hostedReviewCommentErrorResponse(error: unknown) {
  if (error instanceof HostedReviewLinkNotFoundError) {
    return { body: { ok: false, reason: "Review link was not found." }, status: 404 };
  }

  if (error instanceof HostedReviewLinkUnavailableError) {
    return { body: { ok: false, reason: "This review link is no longer accepting feedback." }, status: 410 };
  }

  if (error instanceof HostedReviewCommentPermissionError) {
    return { body: { ok: false, reason: "This review link is view-only." }, status: 403 };
  }

  return { body: { ok: false, reason: "Hosted review comment could not be saved." }, status: 500 };
}

type HostedReviewLinkRow = typeof hostedReviewLinks.$inferSelect;
type HostedReviewCommentRow = typeof hostedReviewComments.$inferSelect;

async function getHostedReviewLinkRow(token: string) {
  const [row] = await getDb()
    .select()
    .from(hostedReviewLinks)
    .where(eq(hostedReviewLinks.token, token.trim()))
    .limit(1);

  return row ?? null;
}

function hostedReviewSummary(row: HostedReviewLinkRow, origin: string): HostedReviewLinkSummary {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    url: hostedReviewLinkUrl(origin, row.token),
    permission: row.permission,
    enabled: row.enabled,
    expired: isHostedReviewExpired(row.expiresAt),
    exportName: row.exportName,
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function hostedReviewCommentSummary(row: HostedReviewCommentRow): HostedReviewComment {
  return {
    id: row.id,
    reviewerName: row.reviewerName,
    reviewerEmail: row.reviewerEmail,
    body: row.body,
    time: row.time,
    anchorLabel: row.anchorLabel,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export class HostedReviewLinkNotFoundError extends Error {
  constructor() {
    super("Hosted review link was not found.");
    this.name = "HostedReviewLinkNotFoundError";
  }
}

export class HostedReviewLinkUnavailableError extends Error {
  constructor() {
    super("Hosted review link is unavailable.");
    this.name = "HostedReviewLinkUnavailableError";
  }
}

export class HostedReviewCommentPermissionError extends Error {
  constructor() {
    super("Hosted review link is view-only.");
    this.name = "HostedReviewCommentPermissionError";
  }
}
