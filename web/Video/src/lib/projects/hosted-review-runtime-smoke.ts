import {
  canHostedReviewComment,
  createHostedReviewCommentInputSchema,
  createHostedReviewLinkInputSchema,
  hostedReviewExpiry,
  hostedReviewLinkUrl,
  isHostedReviewExpired,
  updateHostedReviewLinkInputSchema,
  type CreateHostedReviewLinkInput,
  type HostedReviewComment,
  type HostedReviewLinkPublic,
  type HostedReviewLinkSummary,
  type UpdateHostedReviewLinkInput,
} from "@/lib/projects/hosted-review-link-contracts";

export type HostedReviewRuntimeSmokeStatus = "passed" | "failed";

export interface HostedReviewRuntimeSmokeStep {
  id: string;
  label: string;
  status: HostedReviewRuntimeSmokeStatus;
  detail: string;
}

export interface HostedReviewRuntimeSmokeReport {
  status: HostedReviewRuntimeSmokeStatus;
  passedCount: number;
  failedCount: number;
  steps: HostedReviewRuntimeSmokeStep[];
}

export interface HostedReviewRuntimeSmokeStore {
  createLink(input: CreateHostedReviewLinkInput, now: Date): Promise<HostedReviewLinkSummary>;
  updateLink(input: UpdateHostedReviewLinkInput, now: Date): Promise<HostedReviewLinkSummary | null>;
  getPublicLink(token: string, now: Date): Promise<HostedReviewLinkPublic | null>;
  createComment(token: string, input: unknown, now: Date): Promise<HostedReviewComment | null>;
  listComments(token: string): Promise<HostedReviewComment[]>;
}

export async function runHostedReviewRuntimeSmoke(
  store: HostedReviewRuntimeSmokeStore,
  now = new Date(),
): Promise<HostedReviewRuntimeSmokeReport> {
  const steps: HostedReviewRuntimeSmokeStep[] = [];
  const created = await store.createLink({ projectId: "project-runtime-smoke", permission: "comment-only", expiresInDays: 2, exportName: "launch-cut.mp4" }, now);
  const token = readToken(created.url);
  const publicLink = await store.getPublicLink(token, now);

  addStep(steps, "public-load", "Public review loading", Boolean(publicLink && !publicLink.expired && publicLink.enabled), "Fresh public review links load while enabled.");

  const firstComment = await store.createComment(
    token,
    { reviewerName: "Reviewer", reviewerEmail: "reviewer@example.com", body: "Tighten the intro.", anchorLabel: "00:12 title card" },
    now,
  );
  const comments = await store.listComments(token);
  addStep(
    steps,
    "comment-create",
    "Reviewer comments",
    Boolean(firstComment && comments.length === 1 && comments[0]?.body === "Tighten the intro."),
    "Comment-enabled links accept reviewer feedback and persist it for the share page.",
  );

  const viewOnly = await store.updateLink({ id: created.id, permission: "view" }, now);
  const blockedComment = await store.createComment(token, { body: "This should not save." }, now);
  addStep(
    steps,
    "view-only-access",
    "View-only access",
    Boolean(viewOnly?.permission === "view" && !blockedComment),
    "View-only links load without accepting comments.",
  );

  const downloadLink = await store.updateLink({ id: created.id, permission: "download" }, now);
  const downloadComment = await store.createComment(token, { body: "Download link comment." }, now);
  addStep(
    steps,
    "download-comment-access",
    "Download access comments",
    Boolean(downloadLink?.permission === "download" && downloadComment),
    "Download links keep reviewer comments enabled.",
  );

  const revoked = await store.updateLink({ id: created.id, enabled: false }, now);
  const revokedPublicLink = await store.getPublicLink(token, now);
  const revokedComment = await store.createComment(token, { body: "Revoked comment." }, now);
  addStep(
    steps,
    "revoke-link",
    "Revoke behavior",
    Boolean(revoked && revoked.enabled === false && revokedPublicLink?.enabled === false && !revokedComment),
    "Revoked hosted review links stay visible as disabled metadata and stop accepting feedback.",
  );

  const renewed = await store.updateLink({ id: created.id, enabled: true, expiresInDays: 30 }, now);
  const renewedPublicLink = await store.getPublicLink(token, new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000));
  addStep(
    steps,
    "renew-link",
    "Renew behavior",
    Boolean(renewed?.enabled && renewedPublicLink && !renewedPublicLink.expired),
    "Renewed hosted review links extend expiry and can load again.",
  );

  await store.updateLink({ id: created.id, expiresInDays: 1 }, now);
  const expiredAt = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const expiredPublicLink = await store.getPublicLink(token, expiredAt);
  const expiredComment = await store.createComment(token, { body: "Expired comment." }, expiredAt);
  addStep(
    steps,
    "expiry-block",
    "Expiry behavior",
    Boolean(expiredPublicLink?.expired && !expiredComment),
    "Expired hosted review links load as expired and stop accepting feedback.",
  );

  const failedCount = steps.filter((step) => step.status === "failed").length;
  return {
    status: failedCount > 0 ? "failed" : "passed",
    passedCount: steps.length - failedCount,
    failedCount,
    steps,
  };
}

export function createInMemoryHostedReviewRuntimeStore(origin = "https://essence.example"): HostedReviewRuntimeSmokeStore {
  const links = new Map<string, HostedRuntimeLinkRecord>();
  const comments = new Map<string, HostedReviewComment[]>();

  return {
    async createLink(input, now) {
      const payload = createHostedReviewLinkInputSchema.parse(input);
      const id = `hosted_link_${links.size + 1}`;
      const token = `token_${links.size + 1}`;
      const timestamp = now.toISOString();
      const record: HostedRuntimeLinkRecord = {
        id,
        token,
        projectId: payload.projectId,
        title: "Runtime smoke project",
        url: hostedReviewLinkUrl(origin, token),
        permission: payload.permission,
        enabled: true,
        exportName: payload.exportName ?? null,
        expiresAt: hostedReviewExpiry(payload.expiresInDays, now),
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      links.set(id, record);
      return hostedRuntimeLinkSummary(record, now);
    },
    async updateLink(input, now) {
      const payload = updateHostedReviewLinkInputSchema.parse(input);
      const record = links.get(payload.id);
      if (!record) return null;

      const nextRecord = {
        ...record,
        permission: payload.permission ?? record.permission,
        enabled: payload.enabled ?? record.enabled,
        expiresAt: payload.expiresInDays ? hostedReviewExpiry(payload.expiresInDays, now) : record.expiresAt,
        updatedAt: now.toISOString(),
      };

      links.set(nextRecord.id, nextRecord);
      return hostedRuntimeLinkSummary(nextRecord, now);
    },
    async getPublicLink(token, now) {
      const record = [...links.values()].find((item) => item.token === token);
      if (!record) return null;

      return {
        token: record.token,
        title: record.title,
        permission: record.permission,
        enabled: record.enabled,
        expired: isHostedReviewExpired(record.expiresAt, now),
        exportName: record.exportName,
        expiresAt: record.expiresAt.toISOString(),
        createdAt: record.createdAt,
      };
    },
    async createComment(token, input, now) {
      const record = [...links.values()].find((item) => item.token === token);
      if (!record || !record.enabled || isHostedReviewExpired(record.expiresAt, now) || !canHostedReviewComment(record.permission)) return null;

      const payload = createHostedReviewCommentInputSchema.parse(input);
      const comment: HostedReviewComment = {
        id: `hosted_comment_${(comments.get(token)?.length ?? 0) + 1}`,
        reviewerName: payload.reviewerName,
        reviewerEmail: payload.reviewerEmail ?? null,
        body: payload.body,
        time: payload.time ?? null,
        anchorLabel: payload.anchorLabel ?? null,
        resolvedAt: null,
        createdAt: now.toISOString(),
      };
      comments.set(token, [...(comments.get(token) ?? []), comment]);
      return comment;
    },
    async listComments(token) {
      return comments.get(token) ?? [];
    },
  };
}

interface HostedRuntimeLinkRecord extends Omit<HostedReviewLinkSummary, "expired" | "expiresAt"> {
  token: string;
  expiresAt: Date;
}

function hostedRuntimeLinkSummary(record: HostedRuntimeLinkRecord, now: Date): HostedReviewLinkSummary {
  return {
    id: record.id,
    projectId: record.projectId,
    title: record.title,
    url: record.url,
    permission: record.permission,
    enabled: record.enabled,
    expired: isHostedReviewExpired(record.expiresAt, now),
    exportName: record.exportName,
    expiresAt: record.expiresAt.toISOString(),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function addStep(
  steps: HostedReviewRuntimeSmokeStep[],
  id: string,
  label: string,
  passed: boolean,
  detail: string,
) {
  steps.push({
    id,
    label,
    status: passed ? "passed" : "failed",
    detail,
  });
}

function readToken(url: string) {
  const parsed = new URL(url);
  return decodeURIComponent(parsed.pathname.split("/").filter(Boolean).at(-1) ?? "");
}
