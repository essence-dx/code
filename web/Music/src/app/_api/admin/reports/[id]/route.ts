import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import {
  contentReports,
  hookPosts,
  playlists,
  publicComments,
  songs,
  user as users,
} from "@/db/schema";
import { adminErrorResponse, requireAdminUser } from "@/lib/admin";
import { jsonError, normalizeRouteError } from "@/lib/api";
import {
  isResolvedReportStatus,
  reportStatusSchema,
} from "@/lib/moderation";

export const runtime = "nodejs";

const updateReportSchema = z.object({
  adminNote: z.string().trim().max(1200).optional(),
  targetAction: z.enum(["none", "hide", "restore"]).default("none"),
  status: reportStatusSchema,
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdminUser(request);
    const { id } = await context.params;
    const input = updateReportSchema.parse(await request.json());
    const db = getDb();
    const [report] = await db
      .select()
      .from(contentReports)
      .where(eq(contentReports.id, id))
      .limit(1);

    if (!report) {
      return jsonError("Report not found.", 404);
    }

    await applyTargetAction(report, input.targetAction);

    const now = new Date();
    const [updated] = await db
      .update(contentReports)
      .set({
        adminNote: input.adminNote ?? report.adminNote,
        resolvedAt: isResolvedReportStatus(input.status)
          ? (report.resolvedAt ?? now)
          : null,
        status: input.status,
        updatedAt: now,
      })
      .where(eq(contentReports.id, id))
      .returning();

    return NextResponse.json({ report: serializeReport(updated) });
  } catch (error) {
    return adminErrorResponse(error) ?? normalizeRouteError(error);
  }
}

async function applyTargetAction(
  report: typeof contentReports.$inferSelect,
  action: z.infer<typeof updateReportSchema>["targetAction"],
) {
  if (action === "none") {
    return;
  }

  const moderationStatus = action === "hide" ? "hidden" : "clean";
  const now = new Date();
  const db = getDb();

  if (report.targetType === "song") {
    await db
      .update(songs)
      .set({ moderationStatus, updatedAt: now })
      .where(eq(songs.id, report.targetId));
    return;
  }

  if (report.targetType === "playlist") {
    await db
      .update(playlists)
      .set({ moderationStatus, updatedAt: now })
      .where(eq(playlists.id, report.targetId));
    return;
  }

  if (report.targetType === "comment") {
    await db
      .update(publicComments)
      .set({
        hiddenByUserId: null,
        status: action === "hide" ? "hidden" : "visible",
        updatedAt: now,
      })
      .where(eq(publicComments.id, report.targetId));
    return;
  }

  if (report.targetType === "hook") {
    await db
      .update(hookPosts)
      .set({ moderationStatus, updatedAt: now })
      .where(eq(hookPosts.id, report.targetId));
    return;
  }

  if (report.targetType !== "profile") {
    return;
  }

  await db
    .update(users)
    .set({
      profileModerationStatus: moderationStatus,
      updatedAt: now,
    })
    .where(eq(users.id, report.targetId));
}

function serializeReport(report: typeof contentReports.$inferSelect) {
  return {
    ...report,
    createdAt:
      report.createdAt instanceof Date
        ? report.createdAt.toISOString()
        : report.createdAt,
    resolvedAt:
      report.resolvedAt instanceof Date
        ? report.resolvedAt.toISOString()
        : report.resolvedAt,
    updatedAt:
      report.updatedAt instanceof Date
        ? report.updatedAt.toISOString()
        : report.updatedAt,
  };
}
