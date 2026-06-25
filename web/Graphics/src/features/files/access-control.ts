import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { designFile, designFileCollaborator } from "@/db/schema";
import {
  normalizeCollaboratorRole,
  type FileAccessRole,
} from "@/features/files/permissions";

export async function getFileAccessForUser(fileId: string, userId: string) {
  const db = getDb();
  const [ownedFile] = await db
    .select()
    .from(designFile)
    .where(
      and(eq(designFile.id, fileId), eq(designFile.ownerId, userId)),
    )
    .limit(1);

  if (ownedFile) {
    return {
      file: ownedFile,
      role: "owner" as const,
    };
  }

  const [collaboratorFile] = await db
    .select({
      id: designFile.id,
      ownerId: designFile.ownerId,
      name: designFile.name,
      document: designFile.document,
      scope: designFile.scope,
      teamName: designFile.teamName,
      projectName: designFile.projectName,
      favorite: designFile.favorite,
      lastOpenedAt: designFile.lastOpenedAt,
      trashedAt: designFile.trashedAt,
      createdAt: designFile.createdAt,
      updatedAt: designFile.updatedAt,
      role: designFileCollaborator.role,
    })
    .from(designFileCollaborator)
    .innerJoin(designFile, eq(designFileCollaborator.fileId, designFile.id))
    .where(
      and(
        eq(designFileCollaborator.fileId, fileId),
        eq(designFileCollaborator.userId, userId),
      ),
    )
    .limit(1);

  if (!collaboratorFile) {
    return null;
  }

  const { role, ...file } = collaboratorFile;

  return {
    file,
    role: normalizeCollaboratorRole(role),
  };
}

export async function requireFileAccess(
  fileId: string,
  userId: string,
  predicate: (role: FileAccessRole) => boolean,
  errorMessage: string,
) {
  const access = await getFileAccessForUser(fileId, userId);

  if (!access || access.file.trashedAt || !predicate(access.role)) {
    throw new Error(errorMessage);
  }

  return access;
}

export async function requireOwnedFile(fileId: string, userId: string) {
  return requireFileAccess(
    fileId,
    userId,
    (role) => role === "owner",
    "File owner access is required.",
  );
}
