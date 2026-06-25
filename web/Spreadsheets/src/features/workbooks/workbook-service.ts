import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { user, workbook } from "@/db/schema";
import { createDefaultWorkbookDocument } from "@/features/workbooks/default-workbook";
import { normalizeWorkbookDocument } from "@/features/workbooks/serialization";
import { canEditWorkbook } from "@/features/workbooks/sharing-permissions";
import {
  getAcceptedWorkbookRoleForUser,
  listAcceptedWorkbookAccessForUser,
  listWorkbookSharingSummaries,
  type WorkbookUserIdentity,
} from "@/features/workbooks/workbook-sharing-service";
import type {
  PersistedWorkbook,
  WorkbookDocument,
  WorkbookRole,
  WorkbookSharingSummary,
  WorkbookSummary,
} from "@/features/workbooks/types";

function parseMetadataDate(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function workbookActivityTime(workbook: WorkbookSummary) {
  return workbook.lastOpenedAt ?? workbook.updatedAt;
}

function toWorkbookSummary(row: {
  id: string;
  name: string;
  ownerEmail: string;
  data: WorkbookDocument;
  createdAt: Date;
  updatedAt: Date;
}, options?: {
  accessRole?: WorkbookRole;
  sharing?: WorkbookSharingSummary;
}): WorkbookSummary {
  const document = normalizeWorkbookDocument(row.data);

  return {
    id: row.id,
    name: row.name,
    accessRole: options?.accessRole ?? "owner",
    ownerEmail: row.ownerEmail,
    isFavorite: document.metadata.favorite,
    isTemplate: document.metadata.isTemplate,
    folderName: document.metadata.folderName,
    description: document.metadata.description,
    tags: document.metadata.tags,
    lastOpenedAt: parseMetadataDate(document.metadata.lastOpenedAt),
    sharing: options?.sharing,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function updateWorkbookMetadata(
  document: WorkbookDocument,
  metadata: Partial<WorkbookDocument["metadata"]>,
) {
  const updatedAt = new Date().toISOString();

  return normalizeWorkbookDocument({
    ...document,
    metadata: {
      ...document.metadata,
      ...metadata,
      updatedAt,
    },
  });
}

function parseTagsInput(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => tag.slice(0, 32)),
    ),
  ).slice(0, 12);
}

export async function listWorkbooks(ownerId: string): Promise<WorkbookSummary[]> {
  const rows = await getDb()
    .select({
      id: workbook.id,
      name: workbook.name,
      ownerEmail: user.email,
      data: workbook.data,
      createdAt: workbook.createdAt,
      updatedAt: workbook.updatedAt,
    })
    .from(workbook)
    .innerJoin(user, eq(workbook.ownerId, user.id))
    .where(eq(workbook.ownerId, ownerId))
    .orderBy(desc(workbook.updatedAt));
  const sharingByWorkbookId = await listWorkbookSharingSummaries(
    rows.map((row) => row.id),
  );

  return rows
    .map((row) =>
      toWorkbookSummary(row, {
        accessRole: "owner",
        sharing: sharingByWorkbookId.get(row.id),
      }),
    )
    .sort((left, right) => {
      if (left.isFavorite !== right.isFavorite) {
        return left.isFavorite ? -1 : 1;
      }

      return workbookActivityTime(right).getTime() - workbookActivityTime(left).getTime();
    });
}

export async function listWorkbooksForUser(
  currentUser: WorkbookUserIdentity,
): Promise<WorkbookSummary[]> {
  const [ownedRows, acceptedAccessRows] = await Promise.all([
    getDb()
      .select({
        id: workbook.id,
        ownerId: workbook.ownerId,
        name: workbook.name,
        ownerEmail: user.email,
        data: workbook.data,
        createdAt: workbook.createdAt,
        updatedAt: workbook.updatedAt,
      })
      .from(workbook)
      .innerJoin(user, eq(workbook.ownerId, user.id))
      .where(eq(workbook.ownerId, currentUser.id))
      .orderBy(desc(workbook.updatedAt)),
    listAcceptedWorkbookAccessForUser(currentUser),
  ]);
  const ownedWorkbookIds = new Set(ownedRows.map((row) => row.id));
  const sharedWorkbookIds = acceptedAccessRows
    .map((row) => row.workbookId)
    .filter((workbookId) => !ownedWorkbookIds.has(workbookId));
  const sharingByWorkbookId = await listWorkbookSharingSummaries(
    ownedRows.map((row) => row.id),
  );
  const sharedRows =
    sharedWorkbookIds.length > 0
      ? await getDb()
          .select({
            id: workbook.id,
            ownerId: workbook.ownerId,
            name: workbook.name,
            ownerEmail: user.email,
            data: workbook.data,
            createdAt: workbook.createdAt,
            updatedAt: workbook.updatedAt,
          })
          .from(workbook)
          .innerJoin(user, eq(workbook.ownerId, user.id))
          .where(inArray(workbook.id, sharedWorkbookIds))
      : [];
  const accessRoleByWorkbookId = new Map(
    acceptedAccessRows.map((row) => [
      row.workbookId,
      row.role as Exclude<WorkbookRole, "owner">,
    ]),
  );
  const summaries = [
    ...ownedRows.map((row) =>
      toWorkbookSummary(row, {
        accessRole: "owner",
        sharing: sharingByWorkbookId.get(row.id),
      }),
    ),
    ...sharedRows.map((row) =>
      toWorkbookSummary(row, {
        accessRole: accessRoleByWorkbookId.get(row.id) ?? "viewer",
      }),
    ),
  ];

  return summaries.sort((left, right) => {
    if (left.isFavorite !== right.isFavorite) {
      return left.isFavorite ? -1 : 1;
    }

    return workbookActivityTime(right).getTime() - workbookActivityTime(left).getTime();
  });
}

export async function createWorkbook(ownerId: string, name: string) {
  const now = new Date();
  const id = crypto.randomUUID();

  await getDb().insert(workbook).values({
    id,
    ownerId,
    name: name.trim() || "Untitled workbook",
    data: createDefaultWorkbookDocument(),
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

export async function createWorkbookFromDocument(
  ownerId: string,
  name: string,
  document: WorkbookDocument,
) {
  const now = new Date();
  const id = crypto.randomUUID();

  await getDb().insert(workbook).values({
    id,
    ownerId,
    name: name.trim().slice(0, 120) || "Imported workbook",
    data: normalizeWorkbookDocument(document),
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

export async function createWorkbookFromSavedTemplate(
  ownerId: string,
  workbookId: string,
) {
  const source = await getWorkbook(ownerId, workbookId);

  if (!source || !source.isTemplate) {
    return null;
  }

  const document = updateWorkbookMetadata(
    {
      ...source.document,
      versionHistory: [],
      versionRestores: [],
    },
    {
      favorite: false,
      isTemplate: false,
      lastOpenedAt: "",
    },
  );

  return createWorkbookFromDocument(ownerId, `${source.name} Workbook`, document);
}

export async function duplicateWorkbook(ownerId: string, workbookId: string) {
  const source = await getWorkbook(ownerId, workbookId);

  if (!source) {
    return null;
  }

  const now = new Date();
  const id = crypto.randomUUID();

  await getDb().insert(workbook).values({
    id,
    ownerId,
    name: `Copy of ${source.name}`,
    data: updateWorkbookMetadata(source.document, {
      favorite: false,
      isTemplate: false,
      lastOpenedAt: "",
    }),
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

export async function renameWorkbook(
  ownerId: string,
  workbookId: string,
  name: string,
) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return false;
  }

  const result = await getDb()
    .update(workbook)
    .set({
      name: trimmedName.slice(0, 120),
      updatedAt: new Date(),
    })
    .where(and(eq(workbook.id, workbookId), eq(workbook.ownerId, ownerId)));

  return result.rowsAffected > 0;
}

export async function deleteWorkbook(ownerId: string, workbookId: string) {
  const result = await getDb()
    .delete(workbook)
    .where(and(eq(workbook.id, workbookId), eq(workbook.ownerId, ownerId)));

  return result.rowsAffected > 0;
}

export async function setWorkbookFavorite(
  ownerId: string,
  workbookId: string,
  favorite: boolean,
) {
  const source = await getWorkbook(ownerId, workbookId);

  if (!source) {
    return false;
  }

  const document = updateWorkbookMetadata(source.document, { favorite });
  const result = await getDb()
    .update(workbook)
    .set({ data: document })
    .where(and(eq(workbook.id, workbookId), eq(workbook.ownerId, ownerId)));

  return result.rowsAffected > 0;
}

export async function setWorkbookTemplate(
  ownerId: string,
  workbookId: string,
  isTemplate: boolean,
) {
  const source = await getWorkbook(ownerId, workbookId);

  if (!source) {
    return false;
  }

  const document = updateWorkbookMetadata(source.document, { isTemplate });
  const result = await getDb()
    .update(workbook)
    .set({ data: document })
    .where(and(eq(workbook.id, workbookId), eq(workbook.ownerId, ownerId)));

  return result.rowsAffected > 0;
}

export async function setWorkbookFolder(
  ownerId: string,
  workbookId: string,
  folderName: string,
) {
  const source = await getWorkbook(ownerId, workbookId);

  if (!source) {
    return false;
  }

  const document = updateWorkbookMetadata(source.document, {
    folderName: folderName.trim().slice(0, 80),
  });
  const result = await getDb()
    .update(workbook)
    .set({ data: document })
    .where(and(eq(workbook.id, workbookId), eq(workbook.ownerId, ownerId)));

  return result.rowsAffected > 0;
}

export async function updateWorkbookProperties(
  ownerId: string,
  workbookId: string,
  input: {
    description: string;
    tags: string;
  },
) {
  const source = await getWorkbook(ownerId, workbookId);

  if (!source) {
    return false;
  }

  const document = updateWorkbookMetadata(source.document, {
    description: input.description.trim().slice(0, 240),
    tags: parseTagsInput(input.tags),
  });
  const result = await getDb()
    .update(workbook)
    .set({ data: document })
    .where(and(eq(workbook.id, workbookId), eq(workbook.ownerId, ownerId)));

  return result.rowsAffected > 0;
}

export async function markWorkbookOpened(
  ownerId: string,
  workbookId: string,
  document: WorkbookDocument,
) {
  const openedAt = new Date().toISOString();
  const nextDocument = updateWorkbookMetadata(document, {
    lastOpenedAt: openedAt,
  });
  const result = await getDb()
    .update(workbook)
    .set({ data: nextDocument })
    .where(and(eq(workbook.id, workbookId), eq(workbook.ownerId, ownerId)));

  if (result.rowsAffected === 0) {
    return document;
  }

  return nextDocument;
}

export async function markWorkbookOpenedForUser(
  currentUser: WorkbookUserIdentity,
  workbookId: string,
  document: WorkbookDocument,
) {
  const [row] = await getDb()
    .select({
      ownerId: workbook.ownerId,
    })
    .from(workbook)
    .where(eq(workbook.id, workbookId))
    .limit(1);

  if (row?.ownerId !== currentUser.id) {
    return document;
  }

  return markWorkbookOpened(currentUser.id, workbookId, document);
}

export async function getWorkbook(
  ownerId: string,
  workbookId: string,
): Promise<PersistedWorkbook | null> {
  const [row] = await getDb()
    .select({
      id: workbook.id,
      name: workbook.name,
      ownerEmail: user.email,
      data: workbook.data,
      createdAt: workbook.createdAt,
      updatedAt: workbook.updatedAt,
    })
    .from(workbook)
    .innerJoin(user, eq(workbook.ownerId, user.id))
    .where(and(eq(workbook.id, workbookId), eq(workbook.ownerId, ownerId)))
    .limit(1);

  if (!row) {
    return null;
  }

  const document = normalizeWorkbookDocument(row.data);
  const sharingByWorkbookId = await listWorkbookSharingSummaries([row.id]);
  const summary = toWorkbookSummary(
    { ...row, data: document },
    {
      accessRole: "owner",
      sharing: sharingByWorkbookId.get(row.id),
    },
  );

  return {
    ...summary,
    document,
  };
}

export async function getWorkbookForUser(
  currentUser: WorkbookUserIdentity,
  workbookId: string,
): Promise<PersistedWorkbook | null> {
  const [row] = await getDb()
    .select({
      id: workbook.id,
      ownerId: workbook.ownerId,
      name: workbook.name,
      ownerEmail: user.email,
      data: workbook.data,
      createdAt: workbook.createdAt,
      updatedAt: workbook.updatedAt,
    })
    .from(workbook)
    .innerJoin(user, eq(workbook.ownerId, user.id))
    .where(eq(workbook.id, workbookId))
    .limit(1);

  if (!row) {
    return null;
  }

  const accessRole =
    row.ownerId === currentUser.id
      ? "owner"
      : await getAcceptedWorkbookRoleForUser(currentUser, row.id);

  if (!accessRole) {
    return null;
  }

  const document = normalizeWorkbookDocument(row.data);
  const sharingByWorkbookId =
    accessRole === "owner"
      ? await listWorkbookSharingSummaries([row.id])
      : new Map<string, WorkbookSharingSummary>();
  const summary = toWorkbookSummary(
    { ...row, data: document },
    {
      accessRole,
      sharing: sharingByWorkbookId.get(row.id),
    },
  );

  return {
    ...summary,
    document,
  };
}

export async function saveWorkbook(
  ownerId: string,
  workbookId: string,
  document: WorkbookDocument,
  expectedUpdatedAt?: string,
  force = false,
) {
  const normalized = normalizeWorkbookDocument(document);
  const now = new Date();
  const [current] = await getDb()
    .select({ updatedAt: workbook.updatedAt })
    .from(workbook)
    .where(and(eq(workbook.id, workbookId), eq(workbook.ownerId, ownerId)))
    .limit(1);

  if (!current) {
    return {
      ok: false as const,
      conflict: false as const,
    };
  }

  const expectedTime = expectedUpdatedAt
    ? new Date(expectedUpdatedAt).getTime()
    : current.updatedAt.getTime();

  if (
    !force &&
    Number.isFinite(expectedTime) &&
    current.updatedAt.getTime() !== expectedTime
  ) {
    return {
      ok: false as const,
      conflict: true as const,
      serverUpdatedAt: current.updatedAt,
    };
  }

  await getDb()
    .update(workbook)
    .set({
      data: normalized,
      updatedAt: now,
    })
    .where(and(eq(workbook.id, workbookId), eq(workbook.ownerId, ownerId)));

  return {
    ok: true as const,
    savedAt: now,
  };
}

export async function saveWorkbookForUser(
  currentUser: WorkbookUserIdentity,
  workbookId: string,
  document: WorkbookDocument,
  expectedUpdatedAt?: string,
  force = false,
) {
  const normalized = normalizeWorkbookDocument(document);
  const now = new Date();
  const [current] = await getDb()
    .select({
      ownerId: workbook.ownerId,
      updatedAt: workbook.updatedAt,
    })
    .from(workbook)
    .where(eq(workbook.id, workbookId))
    .limit(1);

  if (!current) {
    return {
      ok: false as const,
      conflict: false as const,
      forbidden: false as const,
    };
  }

  const accessRole =
    current.ownerId === currentUser.id
      ? "owner"
      : await getAcceptedWorkbookRoleForUser(currentUser, workbookId);

  if (!accessRole || !canEditWorkbook(accessRole)) {
    return {
      ok: false as const,
      conflict: false as const,
      forbidden: true as const,
    };
  }

  const expectedTime = expectedUpdatedAt
    ? new Date(expectedUpdatedAt).getTime()
    : current.updatedAt.getTime();

  if (
    !force &&
    Number.isFinite(expectedTime) &&
    current.updatedAt.getTime() !== expectedTime
  ) {
    return {
      ok: false as const,
      conflict: true as const,
      forbidden: false as const,
      serverUpdatedAt: current.updatedAt,
    };
  }

  await getDb()
    .update(workbook)
    .set({
      data: normalized,
      updatedAt: now,
    })
    .where(eq(workbook.id, workbookId));

  return {
    ok: true as const,
    savedAt: now,
  };
}
