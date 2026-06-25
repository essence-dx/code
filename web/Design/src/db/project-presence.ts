import { and, desc, eq, gt } from "drizzle-orm";
import { nanoid } from "nanoid";

import { getDb } from "@/db/client";
import { project, projectPresence, type ProjectPresenceRow } from "@/db/schema";
import type { ProjectPresenceSummary } from "@/features/editor/types";

const activePresenceWindowMs = 45_000;
const presencePalette = [
  "#0ea5e9",
  "#22c55e",
  "#f97316",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
  "#eab308",
  "#ec4899",
];

function toSummary(row: ProjectPresenceRow): ProjectPresenceSummary {
  return {
    userId: row.userId,
    userName: row.userName,
    color: row.color,
    pageId: row.pageId,
    cursorX: row.cursorX,
    cursorY: row.cursorY,
    lastSeenAt: row.lastSeenAt.toISOString(),
  };
}

export type WorkspaceProjectPresenceSummary = ProjectPresenceSummary & {
  projectId: string;
  projectName: string;
};

function toWorkspaceSummary(input: {
  presence: ProjectPresenceRow;
  projectName: string;
}): WorkspaceProjectPresenceSummary {
  return {
    projectId: input.presence.projectId,
    projectName: input.projectName,
    ...toSummary(input.presence),
  };
}

function getPresenceColor(userId: string) {
  const hash = Array.from(userId).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );

  return presencePalette[hash % presencePalette.length];
}

export async function listProjectPresence(input: {
  projectId: string;
  viewerUserId: string;
}) {
  const activeAfter = new Date(Date.now() - activePresenceWindowMs);

  const rows = await getDb()
    .select()
    .from(projectPresence)
    .where(
      and(
        eq(projectPresence.projectId, input.projectId),
        gt(projectPresence.lastSeenAt, activeAfter),
      ),
    )
    .orderBy(desc(projectPresence.lastSeenAt))
    .limit(24);

  return rows.filter((row) => row.userId !== input.viewerUserId).map(toSummary);
}

export async function listWorkspaceProjectPresence(userId: string) {
  const rows = await getDb()
    .select({
      presence: projectPresence,
      projectName: project.name,
    })
    .from(projectPresence)
    .innerJoin(project, eq(projectPresence.projectId, project.id))
    .where(eq(project.userId, userId))
    .orderBy(desc(projectPresence.lastSeenAt))
    .limit(120);

  return rows.map((row) =>
    toWorkspaceSummary({
      presence: row.presence,
      projectName: row.projectName,
    }),
  );
}

export async function updateProjectPresence(input: {
  projectId: string;
  userId: string;
  userName: string;
  pageId: string;
  cursor?: {
    x: number;
    y: number;
  } | null;
}) {
  const now = new Date();

  await getDb()
    .insert(projectPresence)
    .values({
      id: nanoid(),
      projectId: input.projectId,
      userId: input.userId,
      userName: input.userName,
      color: getPresenceColor(input.userId),
      pageId: input.pageId,
      cursorX: input.cursor?.x ?? null,
      cursorY: input.cursor?.y ?? null,
      lastSeenAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [projectPresence.projectId, projectPresence.userId],
      set: {
        userName: input.userName,
        color: getPresenceColor(input.userId),
        pageId: input.pageId,
        cursorX: input.cursor?.x ?? null,
        cursorY: input.cursor?.y ?? null,
        lastSeenAt: now,
        updatedAt: now,
      },
    });
}
