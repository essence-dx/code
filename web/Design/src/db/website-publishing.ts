import { and, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import { getDb } from "@/db/client";
import {
  project,
  websiteAnalyticsEvent,
  websiteCustomDomain,
  websiteFormSubmission,
  websitePublish,
  type WebsiteCustomDomainRow,
  type WebsiteFormSubmissionRow,
  type WebsitePublishRow,
} from "@/db/schema";
import { getProject } from "@/db/projects";
import {
  createWebsiteModelFromProject,
  normalizeWebsiteNavigationStyle,
  parseWebsiteModel,
  stringifyWebsiteModel,
} from "@/features/website/website-model";
import {
  attachVercelProjectDomain,
  getVercelProjectDomainStatus,
} from "@/features/website/vercel-project-domain";
import type { WebsiteModel } from "@/features/editor/types";

export type WebsitePublishStatus = "published" | "unpublished";
export type WebsiteAnalyticsEventType = "view" | "click";
export type WebsiteCustomDomainStatus = "pending" | "verified";
export type WebsiteCustomDomainPlatformStatus =
  | "manual"
  | "attached"
  | "error";

type WebsitePublishAnalytics = {
  viewCount: number;
  clickCount: number;
  lastAnalyticsAt: string | null;
};

export type WebsitePublishSummary = {
  id: string;
  projectId: string;
  projectName: string | null;
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  status: WebsitePublishStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  clickCount: number;
  lastAnalyticsAt: string | null;
  customDomains: WebsiteCustomDomainSummary[];
};

export type WebsitePublishDetail = WebsitePublishSummary & {
  model: WebsiteModel;
};

export type WebsiteFormSubmissionSummary = {
  id: string;
  publishId: string;
  projectId: string;
  websiteTitle: string | null;
  sectionId: string;
  payload: Record<string, string | string[]>;
  createdAt: string;
};

export type WebsiteCustomDomainSummary = {
  id: string;
  publishId: string;
  projectId: string;
  domain: string;
  status: WebsiteCustomDomainStatus;
  verificationName: string;
  verificationValue: string;
  verifiedAt: string | null;
  platformStatus: WebsiteCustomDomainPlatformStatus;
  platformError: string | null;
  platformAttachedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function normalizeStatus(value: unknown): WebsitePublishStatus {
  return value === "unpublished" ? "unpublished" : "published";
}

function normalizeDomainStatus(value: unknown): WebsiteCustomDomainStatus {
  return value === "verified" ? "verified" : "pending";
}

function normalizeDomainPlatformStatus(
  value: unknown,
): WebsiteCustomDomainPlatformStatus {
  return value === "attached" || value === "error" ? value : "manual";
}

function toSummary(input: {
  row: WebsitePublishRow;
  projectName: string | null;
  analytics?: WebsitePublishAnalytics;
  customDomains?: WebsiteCustomDomainSummary[];
}): WebsitePublishSummary {
  const analytics = input.analytics ?? emptyAnalytics();

  return {
    id: input.row.id,
    projectId: input.row.projectId,
    projectName: input.projectName,
    slug: input.row.slug,
    title: input.row.title,
    seoTitle: input.row.seoTitle,
    seoDescription: input.row.seoDescription,
    status: normalizeStatus(input.row.status),
    publishedAt: input.row.publishedAt?.toISOString() ?? null,
    createdAt: input.row.createdAt.toISOString(),
    updatedAt: input.row.updatedAt.toISOString(),
    viewCount: analytics.viewCount,
    clickCount: analytics.clickCount,
    lastAnalyticsAt: analytics.lastAnalyticsAt,
    customDomains: input.customDomains ?? [],
  };
}

function toDetail(input: {
  row: WebsitePublishRow;
  projectName: string | null;
}): WebsitePublishDetail {
  return {
    ...toSummary(input),
    model: parseWebsiteModel(input.row.model),
  };
}

function toSubmissionSummary(input: {
  row: WebsiteFormSubmissionRow;
  websiteTitle: string | null;
}): WebsiteFormSubmissionSummary {
  return {
    id: input.row.id,
    publishId: input.row.publishId,
    projectId: input.row.projectId,
    websiteTitle: input.websiteTitle,
    sectionId: input.row.sectionId,
    payload: parseSubmissionPayload(input.row.payload),
    createdAt: input.row.createdAt.toISOString(),
  };
}

function toCustomDomainSummary(
  row: WebsiteCustomDomainRow,
): WebsiteCustomDomainSummary {
  return {
    id: row.id,
    publishId: row.publishId,
    projectId: row.projectId,
    domain: row.domain,
    status: normalizeDomainStatus(row.status),
    verificationName: row.verificationName,
    verificationValue: row.verificationValue,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    platformStatus: normalizeDomainPlatformStatus(row.platformStatus),
    platformError: row.platformError,
    platformAttachedAt: row.platformAttachedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listWebsitePublishes(userId: string) {
  const rows = await getDb()
    .select({
      publish: websitePublish,
      projectName: project.name,
    })
    .from(websitePublish)
    .leftJoin(project, eq(websitePublish.projectId, project.id))
    .where(eq(websitePublish.userId, userId))
    .orderBy(desc(websitePublish.updatedAt))
    .limit(24);
  const analyticsByPublishId = await getWebsiteAnalyticsByPublishId(userId);
  const domainsByPublishId = await getWebsiteCustomDomainsByPublishId(userId);

  return rows.map((row) =>
    toSummary({
      row: row.publish,
      projectName: row.projectName,
      analytics: analyticsByPublishId.get(row.publish.id),
      customDomains: domainsByPublishId.get(row.publish.id),
    }),
  );
}

export async function listWebsiteFormSubmissions(userId: string) {
  const rows = await getDb()
    .select({
      submission: websiteFormSubmission,
      websiteTitle: websitePublish.title,
    })
    .from(websiteFormSubmission)
    .leftJoin(
      websitePublish,
      eq(websiteFormSubmission.publishId, websitePublish.id),
    )
    .where(eq(websiteFormSubmission.userId, userId))
    .orderBy(desc(websiteFormSubmission.createdAt))
    .limit(30);

  return rows.map((row) =>
    toSubmissionSummary({
      row: row.submission,
      websiteTitle: row.websiteTitle,
    }),
  );
}

export async function getPublishedWebsiteBySlug(slug: string) {
  const [row] = await getDb()
    .select({
      publish: websitePublish,
      projectName: project.name,
    })
    .from(websitePublish)
    .leftJoin(project, eq(websitePublish.projectId, project.id))
    .where(
      and(
        eq(websitePublish.slug, normalizeSlug(slug)),
        eq(websitePublish.status, "published"),
      ),
    )
    .limit(1);

  return row
    ? toDetail({
        row: row.publish,
        projectName: row.projectName,
      })
    : null;
}

export async function getPublishedWebsiteByDomain(domain: string) {
  const normalizedDomain = normalizeDomain(domain);

  if (!normalizedDomain) {
    return null;
  }

  const [row] = await getDb()
    .select({
      publish: websitePublish,
      projectName: project.name,
    })
    .from(websiteCustomDomain)
    .innerJoin(
      websitePublish,
      eq(websiteCustomDomain.publishId, websitePublish.id),
    )
    .leftJoin(project, eq(websitePublish.projectId, project.id))
    .where(
      and(
        eq(websiteCustomDomain.domain, normalizedDomain),
        eq(websiteCustomDomain.status, "verified"),
        eq(websitePublish.status, "published"),
      ),
    )
    .limit(1);

  return row
    ? toDetail({
        row: row.publish,
        projectName: row.projectName,
      })
    : null;
}

export async function publishProjectWebsite(input: {
  userId: string;
  projectId: string;
  title: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  navigationStyle?: string | null;
}) {
  const sourceProject = await getProject({
    userId: input.userId,
    projectId: input.projectId,
  });

  if (!sourceProject) {
    return null;
  }

  const existing = await getPublishByProject({
    userId: input.userId,
    projectId: input.projectId,
  });
  const title = normalizeText(input.title, 120) || sourceProject.name;
  const seoTitle = normalizeText(input.seoTitle, 120) || title;
  const seoDescription = normalizeText(input.seoDescription, 180);
  const navigationStyle = normalizeWebsiteNavigationStyle(
    input.navigationStyle,
  );
  const slug = await getAvailableSlug({
    desiredSlug: input.slug || title,
    existingPublishId: existing?.id ?? null,
  });
  const now = new Date();
  const model = createWebsiteModelFromProject({
    project: sourceProject,
    title,
    seoTitle,
    seoDescription,
    navigationStyle,
  });

  const values = {
    slug,
    title,
    seoTitle,
    seoDescription,
    model: stringifyWebsiteModel(model),
    status: "published",
    publishedAt: now,
    updatedAt: now,
  };

  const [row] = existing
    ? await getDb()
        .update(websitePublish)
        .set(values)
        .where(
          and(
            eq(websitePublish.id, existing.id),
            eq(websitePublish.userId, input.userId),
          ),
        )
        .returning()
    : await getDb()
        .insert(websitePublish)
        .values({
          id: nanoid(),
          userId: input.userId,
          projectId: sourceProject.id,
          createdAt: now,
          ...values,
        })
        .returning();

  return row
    ? toDetail({
        row,
        projectName: sourceProject.name,
      })
    : null;
}

export async function unpublishProjectWebsite(input: {
  userId: string;
  publishId: string;
}) {
  const [row] = await getDb()
    .update(websitePublish)
    .set({
      status: "unpublished",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(websitePublish.id, input.publishId),
        eq(websitePublish.userId, input.userId),
      ),
    )
    .returning();

  return row ? toSummary({ row, projectName: null }) : null;
}

export async function createWebsiteFormSubmission(input: {
  slug: string;
  sectionId: string;
  payload: Record<string, string | string[]>;
}) {
  const publish = await getPublishedWebsiteBySlug(input.slug);

  if (!publish) {
    return null;
  }

  const [row] = await getDb()
    .insert(websiteFormSubmission)
    .values({
      id: nanoid(),
      publishId: publish.id,
      userId: await getWebsiteOwnerId(publish.id),
      projectId: publish.projectId,
      sectionId: normalizeText(input.sectionId, 120) || "section",
      payload: JSON.stringify(input.payload).slice(0, 20000),
      createdAt: new Date(),
    })
    .returning();

  return toSubmissionSummary({
    row,
    websiteTitle: publish.title,
  });
}

export async function recordWebsiteAnalyticsEvent(input: {
  publishId: string;
  projectId: string;
  eventType: WebsiteAnalyticsEventType;
  sectionId?: string | null;
  target?: string | null;
  path?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
}) {
  const userId = await getWebsiteOwnerId(input.publishId);

  if (!userId) {
    return null;
  }

  const [row] = await getDb()
    .insert(websiteAnalyticsEvent)
    .values({
      id: nanoid(),
      publishId: input.publishId,
      userId,
      projectId: input.projectId,
      eventType: input.eventType,
      sectionId: normalizeOptionalText(input.sectionId, 120),
      target: normalizeOptionalText(input.target, 500),
      path: normalizeText(input.path, 500),
      referrer: normalizeOptionalText(input.referrer, 500),
      userAgent: normalizeOptionalText(input.userAgent, 500),
      createdAt: new Date(),
    })
    .returning();

  return row ?? null;
}

export async function recordWebsiteAnalyticsEventBySlug(input: {
  slug: string;
  eventType: WebsiteAnalyticsEventType;
  sectionId?: string | null;
  target?: string | null;
  path?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
}) {
  const publish = await getPublishedWebsiteBySlug(input.slug);

  if (!publish) {
    return null;
  }

  return recordWebsiteAnalyticsEvent({
    publishId: publish.id,
    projectId: publish.projectId,
    eventType: input.eventType,
    sectionId: input.sectionId,
    target: input.target,
    path: input.path,
    referrer: input.referrer,
    userAgent: input.userAgent,
  });
}

export async function addWebsiteCustomDomain(input: {
  userId: string;
  publishId: string;
  domain: string;
}) {
  const publish = await getPublishById({
    userId: input.userId,
    publishId: input.publishId,
  });
  const domain = normalizeDomain(input.domain);

  if (!publish || !domain) {
    return null;
  }

  const [existing] = await getDb()
    .select()
    .from(websiteCustomDomain)
    .where(eq(websiteCustomDomain.domain, domain))
    .limit(1);
  const now = new Date();
  const verificationName = getDomainVerificationName(domain);
  const verificationValue =
    existing?.verificationValue ?? `essence-site-verification=${nanoid(32)}`;

  if (existing && existing.userId !== input.userId) {
    return null;
  }

  const [row] = existing
    ? await getDb()
        .update(websiteCustomDomain)
        .set({
          publishId: publish.id,
          projectId: publish.projectId,
          verificationName,
          verificationValue,
          status: normalizeDomainStatus(existing.status),
          platformStatus: normalizeDomainPlatformStatus(existing.platformStatus),
          platformError: existing.platformError,
          platformAttachedAt: existing.platformAttachedAt,
          updatedAt: now,
        })
        .where(
          and(
            eq(websiteCustomDomain.id, existing.id),
            eq(websiteCustomDomain.userId, input.userId),
          ),
        )
        .returning()
    : await getDb()
        .insert(websiteCustomDomain)
        .values({
          id: nanoid(),
          publishId: publish.id,
          userId: input.userId,
          projectId: publish.projectId,
          domain,
          status: "pending",
          platformStatus: "manual",
          verificationName,
          verificationValue,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

  return row ? toCustomDomainSummary(row) : null;
}

export async function verifyWebsiteCustomDomain(input: {
  userId: string;
  domainId: string;
}) {
  const domain = await getWebsiteCustomDomainById(input);

  if (!domain) {
    return null;
  }

  const verified = await hasVerificationTxtRecord({
    domain: domain.domain,
    verificationName: domain.verificationName,
    verificationValue: domain.verificationValue,
  });
  const [row] = await getDb()
    .update(websiteCustomDomain)
    .set({
      status: verified ? "verified" : "pending",
      verifiedAt: verified ? new Date() : domain.verifiedAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(websiteCustomDomain.id, input.domainId),
        eq(websiteCustomDomain.userId, input.userId),
      ),
    )
    .returning();

  return row ? toCustomDomainSummary(row) : null;
}

export async function attachWebsiteCustomDomainToPlatform(input: {
  userId: string;
  domainId: string;
}) {
  const domain = await getWebsiteCustomDomainById(input);

  if (!domain || normalizeDomainStatus(domain.status) !== "verified") {
    return null;
  }

  const result = await attachVercelProjectDomain(domain.domain);

  return updateWebsiteCustomDomainPlatformState({
    domain,
    result,
  });
}

export async function refreshWebsiteCustomDomainPlatformStatus(input: {
  userId: string;
  domainId: string;
}) {
  const domain = await getWebsiteCustomDomainById(input);

  if (!domain) {
    return null;
  }

  const result = await getVercelProjectDomainStatus(domain.domain);

  return updateWebsiteCustomDomainPlatformState({
    domain,
    result,
  });
}

async function updateWebsiteCustomDomainPlatformState(input: {
  domain: WebsiteCustomDomainRow;
  result: {
    status: WebsiteCustomDomainPlatformStatus;
    message: string | null;
  };
}) {
  const now = new Date();
  const [row] = await getDb()
    .update(websiteCustomDomain)
    .set({
      platformStatus: input.result.status,
      platformError: input.result.message,
      platformAttachedAt:
        input.result.status === "attached"
          ? now
          : input.domain.platformAttachedAt,
      updatedAt: now,
    })
    .where(
      and(
        eq(websiteCustomDomain.id, input.domain.id),
        eq(websiteCustomDomain.userId, input.domain.userId),
      ),
    )
    .returning();

  return row ? toCustomDomainSummary(row) : null;
}

export async function deleteWebsiteCustomDomain(input: {
  userId: string;
  domainId: string;
}) {
  const [row] = await getDb()
    .delete(websiteCustomDomain)
    .where(
      and(
        eq(websiteCustomDomain.id, input.domainId),
        eq(websiteCustomDomain.userId, input.userId),
      ),
    )
    .returning();

  return row ? toCustomDomainSummary(row) : null;
}

async function getWebsiteAnalyticsByPublishId(userId: string) {
  try {
    const rows = await getDb()
      .select({
        publishId: websiteAnalyticsEvent.publishId,
        viewCount: sql<unknown>`sum(case when ${websiteAnalyticsEvent.eventType} = 'view' then 1 else 0 end)`,
        clickCount: sql<unknown>`sum(case when ${websiteAnalyticsEvent.eventType} = 'click' then 1 else 0 end)`,
        lastAnalyticsAt: sql<unknown>`max(${websiteAnalyticsEvent.createdAt})`,
      })
      .from(websiteAnalyticsEvent)
      .where(eq(websiteAnalyticsEvent.userId, userId))
      .groupBy(websiteAnalyticsEvent.publishId);

    return new Map(
      rows.map((row) => [
        row.publishId,
        {
          viewCount: normalizeCount(row.viewCount),
          clickCount: normalizeCount(row.clickCount),
          lastAnalyticsAt: normalizeDate(row.lastAnalyticsAt),
        },
      ]),
    );
  } catch (error) {
    console.error("Failed to load website analytics", error);
    return new Map<string, WebsitePublishAnalytics>();
  }
}

async function getPublishByProject(input: {
  userId: string;
  projectId: string;
}) {
  const [row] = await getDb()
    .select()
    .from(websitePublish)
    .where(
      and(
        eq(websitePublish.userId, input.userId),
        eq(websitePublish.projectId, input.projectId),
      ),
    )
    .limit(1);

  return row ?? null;
}

async function getPublishById(input: { userId: string; publishId: string }) {
  const [row] = await getDb()
    .select()
    .from(websitePublish)
    .where(
      and(
        eq(websitePublish.userId, input.userId),
        eq(websitePublish.id, input.publishId),
      ),
    )
    .limit(1);

  return row ?? null;
}

async function getWebsiteCustomDomainsByPublishId(userId: string) {
  const rows = await getDb()
    .select()
    .from(websiteCustomDomain)
    .where(eq(websiteCustomDomain.userId, userId))
    .orderBy(desc(websiteCustomDomain.updatedAt));

  const domainsByPublishId = new Map<string, WebsiteCustomDomainSummary[]>();

  for (const row of rows) {
    const domains = domainsByPublishId.get(row.publishId) ?? [];

    domains.push(toCustomDomainSummary(row));
    domainsByPublishId.set(row.publishId, domains);
  }

  return domainsByPublishId;
}

async function getWebsiteCustomDomainById(input: {
  userId: string;
  domainId: string;
}) {
  const [row] = await getDb()
    .select()
    .from(websiteCustomDomain)
    .where(
      and(
        eq(websiteCustomDomain.id, input.domainId),
        eq(websiteCustomDomain.userId, input.userId),
      ),
    )
    .limit(1);

  return row ?? null;
}

async function getWebsiteOwnerId(publishId: string) {
  const [row] = await getDb()
    .select({ userId: websitePublish.userId })
    .from(websitePublish)
    .where(eq(websitePublish.id, publishId))
    .limit(1);

  return row?.userId ?? "";
}

async function getAvailableSlug(input: {
  desiredSlug: string;
  existingPublishId: string | null;
}) {
  const baseSlug = normalizeSlug(input.desiredSlug) || nanoid(8);

  for (let index = 0; index < 25; index += 1) {
    const candidate = index === 0 ? baseSlug : `${baseSlug}-${index + 1}`;
    const [row] = await getDb()
      .select({ id: websitePublish.id })
      .from(websitePublish)
      .where(eq(websitePublish.slug, candidate))
      .limit(1);

    if (!row || row.id === input.existingPublishId) {
      return candidate;
    }
  }

  return `${baseSlug}-${nanoid(6)}`;
}

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeDomain(value: unknown) {
  const domain = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");

  if (
    !domain ||
    domain === "localhost" ||
    domain.endsWith(".localhost") ||
    domain.endsWith(".vercel.app") ||
    domain.length > 253 ||
    !/^(?!-)([a-z0-9-]{1,63}\.)+[a-z]{2,63}$/.test(domain)
  ) {
    return "";
  }

  return domain;
}

function getDomainVerificationName(domain: string) {
  return `_essence-studio.${domain}`;
}

async function hasVerificationTxtRecord(input: {
  domain: string;
  verificationName: string;
  verificationValue: string;
}) {
  const { resolveTxt } = await import("node:dns/promises");
  const names = [input.verificationName, input.domain];

  for (const name of names) {
    try {
      const records = await resolveTxt(name);
      const values = records.map((record) => record.join(""));

      if (values.includes(input.verificationValue)) {
        return true;
      }
    } catch {
      // DNS records can legitimately be absent while the user is setting up.
    }
  }

  return false;
}

function normalizeText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .trim()
    .slice(0, maxLength);
}

function normalizeOptionalText(value: unknown, maxLength: number) {
  const text = normalizeText(value, maxLength);

  return text || null;
}

function normalizeCount(value: unknown) {
  const count = Number(value ?? 0);

  return Number.isFinite(count) ? count : 0;
}

function normalizeDate(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const timestamp = Number(value);

  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return null;
  }

  const milliseconds = timestamp < 100000000000 ? timestamp * 1000 : timestamp;

  return new Date(milliseconds).toISOString();
}

function emptyAnalytics(): WebsitePublishAnalytics {
  return {
    viewCount: 0,
    clickCount: 0,
    lastAnalyticsAt: null,
  };
}

function parseSubmissionPayload(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return parsed as Record<string, string | string[]>;
  } catch {
    return {};
  }
}
