import { and, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/db/client";
import { designFileShare, publicRouteEvent } from "@/db/schema";
import {
  getPublicRouteAnalyticsRetentionDate,
  getPublicRouteAnalyticsRetentionDays,
} from "@/features/public-route-analytics/retention";
import {
  publicRouteKinds,
} from "@/features/public-route-analytics/types";

const publicRouteEventPayloadSchema = z.object({
  token: z.string().min(8).max(160),
  routeKind: z.enum(publicRouteKinds),
  viewportWidth: z.number().int().min(0).max(10000).optional(),
  viewportHeight: z.number().int().min(0).max(10000).optional(),
});

export type RecordPublicRouteEventResult = {
  ok: boolean;
  reason:
    | "captured"
    | "expired"
    | "invalid_payload"
    | "not_found"
    | "storage_unavailable";
};

export async function recordPublicRouteEvent({
  headers,
  now = new Date(),
  payload,
  retentionDays = getPublicRouteAnalyticsRetentionDays(),
}: {
  headers: Headers;
  now?: Date;
  payload: unknown;
  retentionDays?: number;
}): Promise<RecordPublicRouteEventResult> {
  const parsed = publicRouteEventPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    return { ok: false, reason: "invalid_payload" };
  }

  try {
    const db = getDb();
    const [share] = await db
      .select({
        id: designFileShare.id,
        fileId: designFileShare.fileId,
        permissionPreset: designFileShare.permissionPreset,
        accessLevel: designFileShare.accessLevel,
        allowComments: designFileShare.allowComments,
        allowDownload: designFileShare.allowDownload,
        expiresAt: designFileShare.expiresAt,
      })
      .from(designFileShare)
      .where(
        and(
          eq(designFileShare.token, parsed.data.token),
          isNull(designFileShare.disabledAt),
        ),
      )
      .limit(1);

    if (!share) {
      return { ok: false, reason: "not_found" };
    }

    if (share.expiresAt && share.expiresAt.getTime() < now.getTime()) {
      return { ok: false, reason: "expired" };
    }

    const referrerOrigin = getReferrerOrigin(headers.get("referer"));
    const host = sanitizeHost(headers.get("host"));

    await db.insert(publicRouteEvent).values({
      id: nanoid(),
      shareId: share.id,
      fileId: share.fileId,
      routeKind: parsed.data.routeKind,
      tokenScope: getTokenScope({
        accessLevel: share.accessLevel,
        allowComments: share.allowComments,
        allowDownload: share.allowDownload,
        permissionPreset: share.permissionPreset,
      }),
      referrerOrigin,
      referrerKind: getReferrerKind(referrerOrigin, host),
      userAgentFamily: getUserAgentFamily(headers.get("user-agent")),
      host,
      viewportWidth: parsed.data.viewportWidth ?? null,
      viewportHeight: parsed.data.viewportHeight ?? null,
      retentionExpiresAt: getPublicRouteAnalyticsRetentionDate(
        now,
        retentionDays,
      ),
      createdAt: now,
    });

    return { ok: true, reason: "captured" };
  } catch {
    return { ok: false, reason: "storage_unavailable" };
  }
}

function getTokenScope({
  accessLevel,
  allowComments,
  allowDownload,
  permissionPreset,
}: {
  accessLevel: string;
  allowComments: boolean;
  allowDownload: boolean;
  permissionPreset: string;
}) {
  return [
    permissionPreset,
    accessLevel,
    allowDownload ? "download" : "no-download",
    allowComments ? "comments" : "no-comments",
  ].join(":");
}

function getReferrerOrigin(referrer: string | null) {
  if (!referrer) {
    return null;
  }

  try {
    return sanitizeHeaderValue(new URL(referrer).origin, 180);
  } catch {
    return null;
  }
}

function getReferrerKind(referrerOrigin: string | null, host: string | null) {
  if (!referrerOrigin) {
    return "direct";
  }

  if (!host) {
    return "external";
  }

  try {
    return new URL(referrerOrigin).host === host ? "internal" : "external";
  } catch {
    return "external";
  }
}

function getUserAgentFamily(userAgent: string | null) {
  const value = userAgent ?? "";

  if (/bot|crawler|spider|preview|slurp/i.test(value)) {
    return "bot";
  }

  if (/edg\//i.test(value)) {
    return "edge";
  }

  if (/firefox\//i.test(value)) {
    return "firefox";
  }

  if (/chrome\//i.test(value) || /crios\//i.test(value)) {
    return "chrome";
  }

  if (/safari\//i.test(value)) {
    return "safari";
  }

  return "unknown";
}

function sanitizeHost(value: string | null) {
  return sanitizeHeaderValue(value, 160);
}

function sanitizeHeaderValue(value: string | null, maxLength: number) {
  const normalized = value?.replace(/[\u0000-\u001f\u007f]/g, "").trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}
