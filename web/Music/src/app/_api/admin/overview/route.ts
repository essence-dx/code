import { desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  aiJobs,
  contentReports,
  playlists,
  session,
  songs,
  user,
} from "@/db/schema";
import { adminErrorResponse, requireAdminUser } from "@/lib/admin";
import { normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const admin = await requireAdminUser(request);
    const db = getDb();
    const [userCount] = await db
      .select({ total: sql<number>`count(*)` })
      .from(user);
    const [songCount] = await db
      .select({ total: sql<number>`count(*)` })
      .from(songs);
    const [playlistCount] = await db
      .select({ total: sql<number>`count(*)` })
      .from(playlists);
    const [jobCount] = await db
      .select({ total: sql<number>`count(*)` })
      .from(aiJobs);
    const [openReportCount] = await db
      .select({ total: sql<number>`count(*)` })
      .from(contentReports)
      .where(eq(contentReports.status, "open"));

    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        sessions: sql<number>`count(${session.id})`,
      })
      .from(user)
      .leftJoin(session, eq(session.userId, user.id))
      .groupBy(user.id)
      .orderBy(desc(user.createdAt))
      .limit(100);
    const reports = await db
      .select()
      .from(contentReports)
      .orderBy(desc(contentReports.createdAt))
      .limit(100);

    return NextResponse.json({
      admin: {
        email: admin.email,
        name: admin.name,
      },
      stats: {
        aiJobs: numberValue(jobCount?.total),
        playlists: numberValue(playlistCount?.total),
        reportsOpen: numberValue(openReportCount?.total),
        songs: numberValue(songCount?.total),
        users: numberValue(userCount?.total),
      },
      reports: reports.map(serializeReport),
      users: users.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        sessions: numberValue(item.sessions),
        updatedAt: item.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    return adminErrorResponse(error) ?? normalizeRouteError(error);
  }
}

function numberValue(value: unknown) {
  return Number(value ?? 0);
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
