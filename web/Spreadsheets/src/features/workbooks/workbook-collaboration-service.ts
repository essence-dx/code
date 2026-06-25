import { and, asc, eq, gt, lt } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  user,
  workbook,
  workbookCollaborationEvent,
  workbookCollaborationPresence,
} from "@/db/schema";
import {
  getPresenceColor,
  workbookPresenceTtlMs,
  type WorkbookPresenceSnapshot,
} from "@/features/spreadsheet/workbook-presence";
import type {
  WorkbookCollaborationClientEvent,
  WorkbookCollaborationEventKind,
  WorkbookCollaborationServerEvent,
  WorkbookCollaborationSyncResponse,
} from "@/features/spreadsheet/workbook-collaboration";
import {
  canEditWorkbook,
  normalizeWorkbookRole,
} from "@/features/workbooks/sharing-permissions";
import {
  getAcceptedWorkbookRoleForUser,
  type WorkbookUserIdentity,
} from "@/features/workbooks/workbook-sharing-service";
import type { WorkbookRole } from "@/features/workbooks/types";

export type WorkbookCollaborationUserIdentity = WorkbookUserIdentity & {
  name: string;
};

type WorkbookCollaborationAccess = {
  role: WorkbookRole;
  workbookId: string;
};

const maxEventsPerResponse = 100;

async function getCollaborationAccess(
  currentUser: WorkbookUserIdentity,
  workbookId: string,
): Promise<WorkbookCollaborationAccess | null> {
  const [row] = await getDb()
    .select({
      ownerId: workbook.ownerId,
    })
    .from(workbook)
    .where(eq(workbook.id, workbookId))
    .limit(1);

  if (!row) {
    return null;
  }

  if (row.ownerId === currentUser.id) {
    return {
      role: "owner",
      workbookId,
    };
  }

  const role = await getAcceptedWorkbookRoleForUser(currentUser, workbookId);

  return role
    ? {
        role: normalizeWorkbookRole(role),
        workbookId,
      }
    : null;
}

function sanitizePresenceSnapshot({
  clientId,
  currentUser,
  snapshot,
}: {
  clientId: string;
  currentUser: WorkbookCollaborationUserIdentity;
  snapshot: WorkbookPresenceSnapshot;
}): WorkbookPresenceSnapshot {
  return {
    activeCellLabel: snapshot.activeCellLabel.slice(0, 32) || "A1",
    clientId,
    color: getPresenceColor(currentUser.email || clientId),
    isDirty: snapshot.isDirty === true,
    lastSeenAt: Date.now(),
    rangeLabel: snapshot.rangeLabel.slice(0, 80) || "A1",
    sheetId: snapshot.sheetId.slice(0, 120),
    sheetName: snapshot.sheetName.slice(0, 80) || "Sheet",
    user: {
      email: currentUser.email,
      name: currentUser.name,
    },
  };
}

async function pruneStaleServerPresence(workbookId: string) {
  await getDb()
    .delete(workbookCollaborationPresence)
    .where(
      and(
        eq(workbookCollaborationPresence.workbookId, workbookId),
        lt(
          workbookCollaborationPresence.updatedAt,
          new Date(Date.now() - workbookPresenceTtlMs),
        ),
      ),
    );
}

async function upsertPresence({
  clientId,
  currentUser,
  snapshot,
  workbookId,
}: {
  clientId: string;
  currentUser: WorkbookCollaborationUserIdentity;
  snapshot: WorkbookPresenceSnapshot | null;
  workbookId: string;
}) {
  if (!snapshot) {
    return;
  }

  const updatedAt = new Date();
  const sanitized = sanitizePresenceSnapshot({
    clientId,
    currentUser,
    snapshot,
  });

  await getDb()
    .insert(workbookCollaborationPresence)
    .values({
      id: `${workbookId}:${clientId}`,
      workbookId,
      clientId,
      userId: currentUser.id,
      snapshot: sanitized,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: [
        workbookCollaborationPresence.workbookId,
        workbookCollaborationPresence.clientId,
      ],
      set: {
        snapshot: sanitized,
        updatedAt,
        userId: currentUser.id,
      },
    });
}

function eventRequiresEdit(kind: WorkbookCollaborationEventKind) {
  return kind !== "selectionChanged";
}

async function enqueueEvents({
  currentUser,
  events,
  role,
  workbookId,
}: {
  currentUser: WorkbookCollaborationUserIdentity;
  events: WorkbookCollaborationClientEvent[];
  role: WorkbookRole;
  workbookId: string;
}) {
  if (events.length === 0) {
    return;
  }

  if (events.some((event) => eventRequiresEdit(event.kind)) && !canEditWorkbook(role)) {
    throw new Error("forbidden");
  }

  await getDb()
    .insert(workbookCollaborationEvent)
    .values(
      events.map((event) => ({
        id: crypto.randomUUID(),
        workbookId,
        clientId: event.clientId,
        clientMutationId: event.clientMutationId,
        userId: currentUser.id,
        kind: event.kind,
        payload: event.payload,
        createdAt: new Date(event.createdAt || Date.now()),
      })),
    )
    .onConflictDoNothing({
      target: [
        workbookCollaborationEvent.workbookId,
        workbookCollaborationEvent.clientMutationId,
      ],
    });
}

async function listServerPresence(workbookId: string) {
  const rows = await getDb()
    .select({
      snapshot: workbookCollaborationPresence.snapshot,
    })
    .from(workbookCollaborationPresence)
    .where(eq(workbookCollaborationPresence.workbookId, workbookId))
    .orderBy(asc(workbookCollaborationPresence.updatedAt));

  return rows.map((row) => row.snapshot);
}

async function listServerEvents({
  afterSequence,
  workbookId,
}: {
  afterSequence: number;
  workbookId: string;
}) {
  const rows = await getDb()
    .select({
      clientId: workbookCollaborationEvent.clientId,
      clientMutationId: workbookCollaborationEvent.clientMutationId,
      createdAt: workbookCollaborationEvent.createdAt,
      kind: workbookCollaborationEvent.kind,
      payload: workbookCollaborationEvent.payload,
      serverSequence: workbookCollaborationEvent.serverSequence,
      userEmail: user.email,
      userName: user.name,
    })
    .from(workbookCollaborationEvent)
    .leftJoin(user, eq(workbookCollaborationEvent.userId, user.id))
    .where(
      and(
        eq(workbookCollaborationEvent.workbookId, workbookId),
        gt(workbookCollaborationEvent.serverSequence, afterSequence),
      ),
    )
    .orderBy(asc(workbookCollaborationEvent.serverSequence))
    .limit(maxEventsPerResponse);

  return rows.map(
    (row): WorkbookCollaborationServerEvent => ({
      clientId: row.clientId,
      clientMutationId: row.clientMutationId,
      createdAt: row.createdAt.getTime(),
      kind: row.kind as WorkbookCollaborationEventKind,
      payload: row.payload,
      serverSequence: row.serverSequence,
      user: {
        email: row.userEmail ?? "collaborator@essence.excel",
        name: row.userName ?? "Workbook collaborator",
      },
    }),
  );
}

export async function syncWorkbookCollaboration({
  afterSequence,
  clientId,
  currentUser,
  events,
  presence,
  workbookId,
}: {
  afterSequence: number;
  clientId: string;
  currentUser: WorkbookCollaborationUserIdentity;
  events: WorkbookCollaborationClientEvent[];
  presence: WorkbookPresenceSnapshot | null;
  workbookId: string;
}): Promise<WorkbookCollaborationSyncResponse | null> {
  const access = await getCollaborationAccess(currentUser, workbookId);

  if (!access) {
    return null;
  }

  await pruneStaleServerPresence(workbookId);
  await upsertPresence({
    clientId,
    currentUser,
    snapshot: presence,
    workbookId,
  });
  await enqueueEvents({
    currentUser,
    events,
    role: access.role,
    workbookId,
  });

  const [serverPresence, serverEvents] = await Promise.all([
    listServerPresence(workbookId),
    listServerEvents({ afterSequence, workbookId }),
  ]);
  const cursor = serverEvents.reduce(
    (highest, event) => Math.max(highest, event.serverSequence),
    afterSequence,
  );

  return {
    cursor,
    events: serverEvents,
    presence: serverPresence,
  };
}
