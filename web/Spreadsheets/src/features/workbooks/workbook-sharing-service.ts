import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  user,
  workbook,
  workbookCollaborator,
  workbookShareLink,
} from "@/db/schema";
import {
  normalizeWorkbookCollaboratorRole,
  pickStrongerWorkbookRole,
} from "@/features/workbooks/sharing-permissions";
import type {
  WorkbookCollaboratorStatus,
  WorkbookRole,
  WorkbookSharingSummary,
} from "@/features/workbooks/types";

export type WorkbookUserIdentity = {
  id: string;
  email: string;
};

type CollaboratorRole = Exclude<WorkbookRole, "owner">;

export function normalizeWorkbookInviteEmail(value: string) {
  return value.trim().toLowerCase().slice(0, 254);
}

function emptySharingSummary(): WorkbookSharingSummary {
  return {
    collaborators: [],
    links: [],
  };
}

function tokenFromId() {
  return crypto.randomUUID().replaceAll("-", "");
}

async function findOwnedWorkbook(ownerId: string, workbookId: string) {
  const [row] = await getDb()
    .select({
      id: workbook.id,
      ownerEmail: user.email,
    })
    .from(workbook)
    .innerJoin(user, eq(workbook.ownerId, user.id))
    .where(and(eq(workbook.id, workbookId), eq(workbook.ownerId, ownerId)))
    .limit(1);

  return row ?? null;
}

async function findUserByEmail(email: string) {
  const [row] = await getDb()
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
    })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  return row ?? null;
}

export async function acceptPendingWorkbookInvitesForUser(
  currentUser: WorkbookUserIdentity,
) {
  const email = normalizeWorkbookInviteEmail(currentUser.email);

  if (!email) {
    return;
  }

  await getDb()
    .update(workbookCollaborator)
    .set({
      userId: currentUser.id,
      status: "accepted",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(workbookCollaborator.email, email),
        or(
          isNull(workbookCollaborator.userId),
          eq(workbookCollaborator.userId, currentUser.id),
        ),
      ),
    );
}

export async function listAcceptedWorkbookAccessForUser(
  currentUser: WorkbookUserIdentity,
) {
  await acceptPendingWorkbookInvitesForUser(currentUser);
  const email = normalizeWorkbookInviteEmail(currentUser.email);

  return getDb()
    .select({
      workbookId: workbookCollaborator.workbookId,
      role: workbookCollaborator.role,
    })
    .from(workbookCollaborator)
    .where(
      and(
        eq(workbookCollaborator.status, "accepted"),
        or(
          eq(workbookCollaborator.userId, currentUser.id),
          eq(workbookCollaborator.email, email),
        ),
      ),
    );
}

export async function getAcceptedWorkbookRoleForUser(
  currentUser: WorkbookUserIdentity,
  workbookId: string,
): Promise<CollaboratorRole | null> {
  await acceptPendingWorkbookInvitesForUser(currentUser);
  const email = normalizeWorkbookInviteEmail(currentUser.email);
  const [row] = await getDb()
    .select({
      role: workbookCollaborator.role,
    })
    .from(workbookCollaborator)
    .where(
      and(
        eq(workbookCollaborator.workbookId, workbookId),
        eq(workbookCollaborator.status, "accepted"),
        or(
          eq(workbookCollaborator.userId, currentUser.id),
          eq(workbookCollaborator.email, email),
        ),
      ),
    )
    .limit(1);

  return row ? normalizeWorkbookCollaboratorRole(row.role) : null;
}

export async function listWorkbookSharingSummaries(workbookIds: string[]) {
  const summaries = new Map<string, WorkbookSharingSummary>();

  for (const workbookId of workbookIds) {
    summaries.set(workbookId, emptySharingSummary());
  }

  if (workbookIds.length === 0) {
    return summaries;
  }

  const [collaborators, links] = await Promise.all([
    getDb()
      .select({
        id: workbookCollaborator.id,
        workbookId: workbookCollaborator.workbookId,
        email: workbookCollaborator.email,
        name: user.name,
        role: workbookCollaborator.role,
        status: workbookCollaborator.status,
        createdAt: workbookCollaborator.createdAt,
        updatedAt: workbookCollaborator.updatedAt,
      })
      .from(workbookCollaborator)
      .leftJoin(user, eq(workbookCollaborator.userId, user.id))
      .where(inArray(workbookCollaborator.workbookId, workbookIds))
      .orderBy(desc(workbookCollaborator.updatedAt)),
    getDb()
      .select({
        id: workbookShareLink.id,
        workbookId: workbookShareLink.workbookId,
        token: workbookShareLink.token,
        role: workbookShareLink.role,
        active: workbookShareLink.active,
        expiresAt: workbookShareLink.expiresAt,
        createdAt: workbookShareLink.createdAt,
      })
      .from(workbookShareLink)
      .where(
        and(
          inArray(workbookShareLink.workbookId, workbookIds),
          eq(workbookShareLink.active, true),
        ),
      )
      .orderBy(desc(workbookShareLink.createdAt)),
  ]);

  for (const collaborator of collaborators) {
    const summary = summaries.get(collaborator.workbookId);

    if (!summary) {
      continue;
    }

    summary.collaborators.push({
      id: collaborator.id,
      email: collaborator.email,
      name: collaborator.name,
      role: normalizeWorkbookCollaboratorRole(collaborator.role),
      status: collaborator.status as WorkbookCollaboratorStatus,
      createdAt: collaborator.createdAt,
      updatedAt: collaborator.updatedAt,
    });
  }

  for (const link of links) {
    const summary = summaries.get(link.workbookId);

    if (!summary) {
      continue;
    }

    summary.links.push({
      id: link.id,
      token: link.token,
      role: normalizeWorkbookCollaboratorRole(link.role),
      active: link.active,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
    });
  }

  return summaries;
}

export async function inviteWorkbookCollaborator(
  ownerId: string,
  workbookId: string,
  input: {
    email: string;
    role: string;
  },
) {
  const ownedWorkbook = await findOwnedWorkbook(ownerId, workbookId);
  const email = normalizeWorkbookInviteEmail(input.email);
  const role = normalizeWorkbookCollaboratorRole(input.role);

  if (!ownedWorkbook || !email) {
    return false;
  }

  if (email === normalizeWorkbookInviteEmail(ownedWorkbook.ownerEmail)) {
    return false;
  }

  const existingCollaborator = await getDb()
    .select({
      userId: workbookCollaborator.userId,
      status: workbookCollaborator.status,
    })
    .from(workbookCollaborator)
    .where(
      and(
        eq(workbookCollaborator.workbookId, workbookId),
        eq(workbookCollaborator.email, email),
      ),
    )
    .limit(1);
  const existingUserId = existingCollaborator[0]?.userId ?? null;
  const targetUser = await findUserByEmail(email);
  const now = new Date();
  const userId = targetUser?.id ?? existingUserId;
  const status: WorkbookCollaboratorStatus = userId ? "accepted" : "pending";

  await getDb()
    .insert(workbookCollaborator)
    .values({
      id: crypto.randomUUID(),
      workbookId,
      userId,
      email,
      role,
      status,
      invitedByUserId: ownerId,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [workbookCollaborator.workbookId, workbookCollaborator.email],
      set: {
        userId,
        role,
        status,
        invitedByUserId: ownerId,
        updatedAt: now,
      },
    });

  return true;
}

export async function removeWorkbookCollaborator(
  ownerId: string,
  collaboratorId: string,
) {
  const [collaborator] = await getDb()
    .select({
      id: workbookCollaborator.id,
    })
    .from(workbookCollaborator)
    .innerJoin(workbook, eq(workbookCollaborator.workbookId, workbook.id))
    .where(
      and(
        eq(workbookCollaborator.id, collaboratorId),
        eq(workbook.ownerId, ownerId),
      ),
    )
    .limit(1);

  if (!collaborator) {
    return false;
  }

  const result = await getDb()
    .delete(workbookCollaborator)
    .where(eq(workbookCollaborator.id, collaboratorId));

  return result.rowsAffected > 0;
}

export async function createWorkbookShareLink(
  ownerId: string,
  workbookId: string,
  input: {
    role: string;
    expiresInDays?: number | null;
  },
) {
  const ownedWorkbook = await findOwnedWorkbook(ownerId, workbookId);

  if (!ownedWorkbook) {
    return null;
  }

  const now = new Date();
  const expiresInDays =
    typeof input.expiresInDays === "number" && Number.isFinite(input.expiresInDays)
      ? Math.min(Math.max(Math.floor(input.expiresInDays), 1), 365)
      : null;
  const row = {
    id: crypto.randomUUID(),
    workbookId,
    token: tokenFromId(),
    role: normalizeWorkbookCollaboratorRole(input.role),
    active: true,
    expiresAt: expiresInDays
      ? new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000)
      : null,
    createdByUserId: ownerId,
    createdAt: now,
    updatedAt: now,
  };

  await getDb().insert(workbookShareLink).values(row);

  return row;
}

export async function disableWorkbookShareLink(ownerId: string, linkId: string) {
  const [link] = await getDb()
    .select({
      id: workbookShareLink.id,
    })
    .from(workbookShareLink)
    .innerJoin(workbook, eq(workbookShareLink.workbookId, workbook.id))
    .where(
      and(eq(workbookShareLink.id, linkId), eq(workbook.ownerId, ownerId)),
    )
    .limit(1);

  if (!link) {
    return false;
  }

  const result = await getDb()
    .update(workbookShareLink)
    .set({
      active: false,
      updatedAt: new Date(),
    })
    .where(eq(workbookShareLink.id, linkId));

  return result.rowsAffected > 0;
}

export async function acceptWorkbookShareLink(
  currentUser: WorkbookUserIdentity,
  token: string,
) {
  const [shareLink] = await getDb()
    .select({
      workbookId: workbookShareLink.workbookId,
      role: workbookShareLink.role,
      expiresAt: workbookShareLink.expiresAt,
      createdByUserId: workbookShareLink.createdByUserId,
      ownerId: workbook.ownerId,
    })
    .from(workbookShareLink)
    .innerJoin(workbook, eq(workbookShareLink.workbookId, workbook.id))
    .where(
      and(
        eq(workbookShareLink.token, token),
        eq(workbookShareLink.active, true),
      ),
    )
    .limit(1);

  if (!shareLink) {
    return null;
  }

  if (shareLink.expiresAt && shareLink.expiresAt.getTime() < Date.now()) {
    return null;
  }

  if (shareLink.ownerId === currentUser.id) {
    return shareLink.workbookId;
  }

  const email = normalizeWorkbookInviteEmail(currentUser.email);

  if (!email) {
    return null;
  }

  const incomingRole = normalizeWorkbookCollaboratorRole(shareLink.role);
  const [existing] = await getDb()
    .select({
      id: workbookCollaborator.id,
      role: workbookCollaborator.role,
    })
    .from(workbookCollaborator)
    .where(
      and(
        eq(workbookCollaborator.workbookId, shareLink.workbookId),
        eq(workbookCollaborator.email, email),
      ),
    )
    .limit(1);
  const role = pickStrongerWorkbookRole(
    existing ? normalizeWorkbookCollaboratorRole(existing.role) : null,
    incomingRole,
  );
  const now = new Date();

  await getDb()
    .insert(workbookCollaborator)
    .values({
      id: crypto.randomUUID(),
      workbookId: shareLink.workbookId,
      userId: currentUser.id,
      email,
      role,
      status: "accepted",
      invitedByUserId: shareLink.createdByUserId,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [workbookCollaborator.workbookId, workbookCollaborator.email],
      set: {
        userId: currentUser.id,
        role,
        status: "accepted",
        updatedAt: now,
      },
    });

  return shareLink.workbookId;
}
