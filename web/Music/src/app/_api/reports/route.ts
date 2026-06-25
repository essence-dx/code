import { and, eq, or } from "drizzle-orm";
import { nanoid } from "nanoid";
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
import { jsonError, normalizeRouteError } from "@/lib/api";
import { auth } from "@/lib/auth";
import { reportReasonSchema, reportTargetTypeSchema } from "@/lib/moderation";

export const runtime = "nodejs";

const createReportSchema = z.object({
  details: z.string().trim().max(1200).default(""),
  reason: reportReasonSchema,
  reporterEmail: z
    .string()
    .trim()
    .max(200)
    .default("")
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: "Enter a valid email address.",
    }),
  targetId: z.string().min(1).max(160),
  targetType: reportTargetTypeSchema,
});

type ReportTargetType = z.infer<typeof reportTargetTypeSchema>;

type ReportTarget = {
  label: string;
  ownerId: string | null;
};

export async function POST(request: Request) {
  try {
    const input = createReportSchema.parse(await request.json());
    const target = await resolveReportTarget(input.targetType, input.targetId);

    if (!target) {
      return jsonError("Report target is not available.", 404);
    }

    const session = await auth.api
      .getSession({ headers: request.headers })
      .catch(() => null);
    const now = new Date();
    const [report] = await getDb()
      .insert(contentReports)
      .values({
        id: nanoid(),
        createdAt: now,
        details: input.details,
        reason: input.reason,
        reporterEmail: input.reporterEmail || session?.user.email || "",
        reporterUserId: session?.user.id ?? null,
        targetId: input.targetId,
        targetLabel: target.label,
        targetOwnerId: target.ownerId,
        targetType: input.targetType,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json({
      report: {
        id: report.id,
        status: report.status,
      },
    });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

async function resolveReportTarget(
  targetType: ReportTargetType,
  targetId: string,
): Promise<ReportTarget | null> {
  if (targetType === "song") {
    const [song] = await getDb()
      .select({
        ownerId: songs.userId,
        title: songs.title,
      })
      .from(songs)
      .innerJoin(users, eq(songs.userId, users.id))
      .where(
        and(
          eq(songs.id, targetId),
          or(eq(songs.visibility, "public"), eq(songs.visibility, "link-only")),
          eq(songs.moderationStatus, "clean"),
          eq(users.profileModerationStatus, "clean"),
        ),
      )
      .limit(1);

    return song
      ? {
          label: song.title,
          ownerId: song.ownerId,
        }
      : null;
  }

  if (targetType === "playlist") {
    const [playlist] = await getDb()
      .select({
        name: playlists.name,
        ownerId: playlists.userId,
      })
      .from(playlists)
      .innerJoin(users, eq(playlists.userId, users.id))
      .where(
        and(
          eq(playlists.id, targetId),
          or(
            eq(playlists.visibility, "public"),
            eq(playlists.visibility, "link-only"),
          ),
          eq(playlists.moderationStatus, "clean"),
          eq(users.profileModerationStatus, "clean"),
        ),
      )
      .limit(1);

    return playlist
      ? {
          label: playlist.name,
          ownerId: playlist.ownerId,
        }
      : null;
  }

  if (targetType === "comment") {
    const [comment] = await getDb()
      .select({
        body: publicComments.body,
        ownerId: publicComments.userId,
      })
      .from(publicComments)
      .innerJoin(users, eq(publicComments.userId, users.id))
      .where(
        and(
          eq(publicComments.id, targetId),
          eq(publicComments.status, "visible"),
          eq(users.profileModerationStatus, "clean"),
        ),
      )
      .limit(1);

    return comment
      ? {
          label: comment.body.slice(0, 120) || "Comment",
          ownerId: comment.ownerId,
        }
      : null;
  }

  if (targetType === "hook") {
    const [hook] = await getDb()
      .select({
        ownerId: hookPosts.userId,
        title: hookPosts.songTitle,
      })
      .from(hookPosts)
      .innerJoin(users, eq(hookPosts.userId, users.id))
      .where(
        and(
          eq(hookPosts.id, targetId),
          eq(hookPosts.visibility, "public"),
          eq(hookPosts.moderationStatus, "clean"),
          eq(users.profileModerationStatus, "clean"),
        ),
      )
      .limit(1);

    return hook
      ? {
          label: hook.title,
          ownerId: hook.ownerId,
        }
      : null;
  }

  const [profile] = await getDb()
    .select({
      id: users.id,
      name: users.name,
    })
    .from(users)
    .where(
      and(
        eq(users.id, targetId),
        eq(users.profileModerationStatus, "clean"),
      ),
    )
    .limit(1);

  return profile
    ? {
        label: profile.name,
        ownerId: profile.id,
      }
    : null;
}
