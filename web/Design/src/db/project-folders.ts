import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { getDb } from "@/db/client";
import { projectFolder, type ProjectFolderRow } from "@/db/schema";
import type { ProjectFolderSummary } from "@/features/editor/types";

function toSummary(row: ProjectFolderRow): ProjectFolderSummary {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listProjectFolders(userId: string) {
  const rows = await getDb()
    .select()
    .from(projectFolder)
    .where(eq(projectFolder.userId, userId))
    .orderBy(desc(projectFolder.updatedAt))
    .limit(50);

  return rows.map(toSummary);
}

export async function createProjectFolder(input: {
  userId: string;
  name: string;
}) {
  const now = new Date();

  const [row] = await getDb()
    .insert(projectFolder)
    .values({
      id: nanoid(),
      userId: input.userId,
      name: input.name,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [projectFolder.userId, projectFolder.name],
      set: {
        updatedAt: now,
      },
    })
    .returning();

  return toSummary(row);
}

export async function getProjectFolder(input: {
  userId: string;
  folderId: string;
}) {
  const [row] = await getDb()
    .select()
    .from(projectFolder)
    .where(
      and(
        eq(projectFolder.userId, input.userId),
        eq(projectFolder.id, input.folderId),
      ),
    )
    .limit(1);

  return row ? toSummary(row) : null;
}
