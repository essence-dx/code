// "use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { designFile } from "@/db/schema";
import type { DesignDocument } from "@/features/editor/types";
import {
  getEmptyCollaborationRoomSnapshot,
  mergeCollaborationRoomSnapshots,
  toCollaborationRoomSnapshot,
  toDesignCollaborationRoomState,
  type CollaborationRoomSnapshot,
} from "@/features/editor/collaboration-room-state";
import { getRequiredUser } from "@/features/files/current-user";
import { requireFileAccess } from "@/features/files/access-control";

const fileRoomSchema = z.object({
  fileId: z.string().min(1),
});

const collaborationChatMessageSchema = z.object({
  id: z.string().min(1),
  peerId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().nullable().optional(),
  color: z.string().min(1),
  text: z.string().min(1).max(240),
  createdAt: z.number().finite(),
});

const collaborationPresenceEventKindSchema = z.enum([
  "joined",
  "left",
  "chat",
  "spotlight-on",
  "spotlight-off",
  "followed",
  "unfollowed",
]);

const collaborationPresenceEventSchema = z.object({
  id: z.string().min(1),
  kind: collaborationPresenceEventKindSchema,
  peerId: z.string().optional(),
  peerName: z.string().min(1),
  peerEmail: z.string().nullable().optional(),
  color: z.string().optional(),
  detail: z.string().optional(),
  createdAt: z.number().finite(),
});

const saveCollaborationRoomSchema = fileRoomSchema.extend({
  snapshot: z.object({
    chatMessages: z.array(collaborationChatMessageSchema).max(80),
    presenceEvents: z.array(collaborationPresenceEventSchema).max(80),
  }),
});

export async function getCollaborationRoomState(input: unknown) {
  const user = await getRequiredUser();
  const parsed = fileRoomSchema.parse(input);
  const access = await requireFileAccess(
    parsed.fileId,
    user.id,
    () => true,
    "File access is required to open this collaboration room.",
  );

  return toCollaborationRoomSnapshot(access.file.document.collaborationRoom);
}

export async function saveCollaborationRoomState(input: unknown) {
  const user = await getRequiredUser();
  const parsed = saveCollaborationRoomSchema.parse(input);
  const access = await requireFileAccess(
    parsed.fileId,
    user.id,
    () => true,
    "File access is required to save this collaboration room.",
  );
  const now = new Date();
  const merged = mergeCollaborationRoomSnapshots(
    toCollaborationRoomSnapshot(access.file.document.collaborationRoom),
    {
      ...parsed.snapshot,
      updatedAt: now.toISOString(),
    },
  );
  const updatedAt = now.toISOString();

  await saveRoomSnapshot(parsed.fileId, access.file.document, merged, now);

  return {
    ok: true,
    updatedAt,
  };
}

export async function clearCollaborationRoomState(input: unknown) {
  const user = await getRequiredUser();
  const parsed = fileRoomSchema.parse(input);
  const access = await requireFileAccess(
    parsed.fileId,
    user.id,
    () => true,
    "File access is required to clear this collaboration room.",
  );
  const now = new Date();

  await saveRoomSnapshot(
    parsed.fileId,
    access.file.document,
    getEmptyCollaborationRoomSnapshot(),
    now,
  );

  return {
    ok: true,
    updatedAt: now.toISOString(),
  };
}

async function saveRoomSnapshot(
  fileId: string,
  document: DesignDocument,
  snapshot: CollaborationRoomSnapshot,
  updatedAt: Date,
) {
  const roomState = toDesignCollaborationRoomState(
    snapshot,
    updatedAt.toISOString(),
  );

  await getDb()
    .update(designFile)
    .set({
      document: {
        ...document,
        collaborationRoom: roomState,
      },
      updatedAt,
    })
    .where(eq(designFile.id, fileId));
}

