import { and, asc, desc, eq, gt, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/db/client";
import { projectCollaborationOperationBatch, user } from "@/db/schema";
import type { SceneCollaborationOperation } from "@/features/editor/scene/scene-collaboration-operations";
import type { ProjectCollaborationClientCursor } from "@/features/projects/collaboration-client-cursors";
import {
  evaluateProjectCollaborationClientSequenceContinuity,
  type ProjectCollaborationClientSequenceRecovery,
} from "@/features/projects/collaboration-client-sequence-continuity";
import type { ProjectCollaborationOperationBatchSummary } from "@/features/projects/collaboration-types";
import { requireProjectRole } from "./project-access-service";

let schemaReady: Promise<void> | null = null;

async function runSchemaStatement(statement: string) {
  await getDb().run(sql.raw(statement));
}

async function addSchemaColumnIfMissing(statement: string) {
  try {
    await runSchemaStatement(statement);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (!message.toLowerCase().includes("duplicate column")) {
      throw error;
    }
  }
}

export async function ensureProjectCollaborationOperationSchema() {
  schemaReady ??= (async () => {
    await runSchemaStatement(`
      CREATE TABLE IF NOT EXISTS project_collaboration_operation_batch (
        id text PRIMARY KEY NOT NULL,
        project_id text NOT NULL REFERENCES project(id) ON DELETE CASCADE,
        user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
        batch_id text NOT NULL UNIQUE,
        client_id text NOT NULL,
        client_sequence integer NOT NULL DEFAULT 0,
        causal_id text NOT NULL DEFAULT '',
        base_updated_at integer,
        operations text NOT NULL,
        operation_count integer NOT NULL,
        created_at integer NOT NULL
      )
    `);
    await addSchemaColumnIfMissing("ALTER TABLE project_collaboration_operation_batch ADD COLUMN client_sequence integer NOT NULL DEFAULT 0");
    await addSchemaColumnIfMissing("ALTER TABLE project_collaboration_operation_batch ADD COLUMN causal_id text NOT NULL DEFAULT ''");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_collaboration_operation_batch_project_idx ON project_collaboration_operation_batch(project_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_collaboration_operation_batch_user_idx ON project_collaboration_operation_batch(user_id)");
    await runSchemaStatement("CREATE INDEX IF NOT EXISTS project_collaboration_operation_batch_created_idx ON project_collaboration_operation_batch(created_at)");
    await runSchemaStatement(
      "CREATE INDEX IF NOT EXISTS project_collaboration_operation_batch_causal_idx ON project_collaboration_operation_batch(project_id, client_id, client_sequence)",
    );
    await runSchemaStatement(
      "CREATE UNIQUE INDEX IF NOT EXISTS project_collaboration_operation_batch_causal_unique_idx ON project_collaboration_operation_batch(project_id, client_id, client_sequence) WHERE client_sequence > 0",
    );
    await runSchemaStatement("CREATE UNIQUE INDEX IF NOT EXISTS project_collaboration_operation_batch_batch_idx ON project_collaboration_operation_batch(batch_id)");
  })();

  await schemaReady;
}

function toSummary(row: {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  userEmail: string;
  batchId: string;
  clientId: string;
  clientSequence: number;
  causalId: string;
  baseUpdatedAt: Date | null;
  operations: SceneCollaborationOperation[];
  operationCount: number;
  createdAt: Date;
}): ProjectCollaborationOperationBatchSummary {
  return {
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    userName: row.userName,
    userEmail: row.userEmail,
    batchId: row.batchId,
    clientId: row.clientId,
    clientSequence: row.clientSequence,
    causalId: row.causalId || createCausalId(row.projectId, row.clientId, row.clientSequence, row.batchId),
    baseUpdatedAt: row.baseUpdatedAt?.toISOString() ?? null,
    operations: row.operations,
    operationCount: row.operationCount,
    createdAt: row.createdAt.toISOString(),
  };
}

const operationBatchSummarySelection = {
  id: projectCollaborationOperationBatch.id,
  projectId: projectCollaborationOperationBatch.projectId,
  userId: projectCollaborationOperationBatch.userId,
  userName: user.name,
  userEmail: user.email,
  batchId: projectCollaborationOperationBatch.batchId,
  clientId: projectCollaborationOperationBatch.clientId,
  clientSequence: projectCollaborationOperationBatch.clientSequence,
  causalId: projectCollaborationOperationBatch.causalId,
  baseUpdatedAt: projectCollaborationOperationBatch.baseUpdatedAt,
  operations: projectCollaborationOperationBatch.operations,
  operationCount: projectCollaborationOperationBatch.operationCount,
  createdAt: projectCollaborationOperationBatch.createdAt,
};

async function findOperationBatchByBatchId(batchId: string) {
  const rows = await getDb()
    .select(operationBatchSummarySelection)
    .from(projectCollaborationOperationBatch)
    .innerJoin(user, eq(projectCollaborationOperationBatch.userId, user.id))
    .where(eq(projectCollaborationOperationBatch.batchId, batchId))
    .limit(1);

  return rows[0] ? toSummary(rows[0]) : null;
}

async function findOperationBatchByCausalStamp(input: { clientId: string; clientSequence?: number | null; projectId: string }) {
  if (!input.clientSequence || input.clientSequence <= 0) {
    return null;
  }

  const rows = await getDb()
    .select(operationBatchSummarySelection)
    .from(projectCollaborationOperationBatch)
    .innerJoin(user, eq(projectCollaborationOperationBatch.userId, user.id))
    .where(
      and(
        eq(projectCollaborationOperationBatch.projectId, input.projectId),
        eq(projectCollaborationOperationBatch.clientId, input.clientId),
        eq(projectCollaborationOperationBatch.clientSequence, input.clientSequence),
      ),
    )
    .limit(1);

  return rows[0] ? toSummary(rows[0]) : null;
}

async function findLatestClientSequence(input: { clientId: string; projectId: string }) {
  const rows = await getDb()
    .select({ clientSequence: projectCollaborationOperationBatch.clientSequence })
    .from(projectCollaborationOperationBatch)
    .where(
      and(
        eq(projectCollaborationOperationBatch.projectId, input.projectId),
        eq(projectCollaborationOperationBatch.clientId, input.clientId),
        gt(projectCollaborationOperationBatch.clientSequence, 0),
      ),
    )
    .orderBy(desc(projectCollaborationOperationBatch.clientSequence))
    .limit(1);

  return rows[0]?.clientSequence ?? 0;
}

async function evaluateClientSequenceContinuity(input: { clientId: string; clientSequence?: number | null; projectId: string }) {
  const latestSequence = await findLatestClientSequence(input);

  return evaluateProjectCollaborationClientSequenceContinuity({
    incomingSequence: input.clientSequence,
    latestSequence,
  });
}

function serializeOperations(operations: SceneCollaborationOperation[]) {
  return JSON.stringify(operations);
}

function createCausalId(projectId: string, clientId: string, clientSequence: number, fallbackId?: string | null) {
  return clientSequence > 0 ? `${projectId}:${clientId}:${clientSequence}` : (fallbackId ?? "");
}

function createOperationBatchListFilter(input: { after?: Date | null; clientCursors?: ProjectCollaborationClientCursor[]; projectId: string }) {
  const projectFilter = eq(projectCollaborationOperationBatch.projectId, input.projectId);
  const cursorFilters = input.clientCursors
    ?.filter((cursor) => cursor.afterSequence >= 0)
    .map((cursor) => and(eq(projectCollaborationOperationBatch.clientId, cursor.clientId), gt(projectCollaborationOperationBatch.clientSequence, cursor.afterSequence)));
  const windowFilters = [
    input.after ? gt(projectCollaborationOperationBatch.createdAt, input.after) : null,
    ...(cursorFilters ?? []),
  ].filter((filter): filter is NonNullable<typeof filter> => Boolean(filter));

  if (windowFilters.length === 0) {
    return projectFilter;
  }

  const windowFilter = windowFilters.length === 1 ? windowFilters[0] : or(...windowFilters);

  return and(projectFilter, windowFilter);
}

function isMatchingOperationBatchRetry(
  existingBatch: ProjectCollaborationOperationBatchSummary,
  input: {
    baseUpdatedAt?: Date | null;
    batchId?: string | null;
    causalId?: string | null;
    clientId: string;
    clientSequence?: number | null;
    operations: SceneCollaborationOperation[];
    projectId: string;
    userId: string;
  },
) {
  const clientSequence = input.clientSequence ?? 0;
  const causalId = input.causalId ?? createCausalId(input.projectId, input.clientId, clientSequence, existingBatch.batchId);
  const isBatchIdRetry = Boolean(input.batchId && existingBatch.batchId === input.batchId);

  return (
    existingBatch.projectId === input.projectId &&
    existingBatch.userId === input.userId &&
    existingBatch.clientId === input.clientId &&
    (existingBatch.clientSequence === clientSequence || isBatchIdRetry) &&
    (existingBatch.causalId === causalId || isBatchIdRetry) &&
    existingBatch.baseUpdatedAt === (input.baseUpdatedAt?.toISOString() ?? null) &&
    existingBatch.operationCount === input.operations.length &&
    serializeOperations(existingBatch.operations) === serializeOperations(input.operations)
  );
}

async function resolveOperationBatchRetryAfterInsertFailure(
  input: {
    baseUpdatedAt?: Date | null;
    batchId?: string | null;
    causalId?: string | null;
    clientId: string;
    clientSequence?: number | null;
    operations: SceneCollaborationOperation[];
    projectId: string;
    userId: string;
  },
  error: unknown,
) {
  const existingBatch = (input.batchId ? await findOperationBatchByBatchId(input.batchId) : null) ?? (await findOperationBatchByCausalStamp(input));

  if (!existingBatch) {
    throw error;
  }

  if (!isMatchingOperationBatchRetry(existingBatch, input)) {
    return { error: "Collaboration operation causality is already used for a different payload", status: 400 as const };
  }

  return { operationBatch: existingBatch };
}

export async function listProjectCollaborationOperationBatches(input: {
  after?: Date | null;
  clientCursors?: ProjectCollaborationClientCursor[];
  projectId: string;
  userId: string;
}): Promise<{ operationBatches: ProjectCollaborationOperationBatchSummary[] } | { error: string; status: 403 | 404 }> {
  await ensureProjectCollaborationOperationSchema();
  const access = await requireProjectRole(input.projectId, input.userId, "viewer");

  if ("error" in access) {
    return access;
  }

  const rows = await getDb()
    .select(operationBatchSummarySelection)
    .from(projectCollaborationOperationBatch)
    .innerJoin(user, eq(projectCollaborationOperationBatch.userId, user.id))
    .where(createOperationBatchListFilter(input))
    .orderBy(asc(projectCollaborationOperationBatch.createdAt), asc(projectCollaborationOperationBatch.id))
    .limit(100);

  return {
    operationBatches: rows.map(toSummary),
  };
}

export async function createProjectCollaborationOperationBatch(input: {
  baseUpdatedAt?: Date | null;
  batchId?: string | null;
  causalId?: string | null;
  clientId: string;
  clientSequence?: number | null;
  operations: SceneCollaborationOperation[];
  projectId: string;
  userId: string;
}): Promise<
  | { operationBatch: ProjectCollaborationOperationBatchSummary }
  | { error: string; status: 400 | 403 | 404 }
  | { clientSequenceRecovery: ProjectCollaborationClientSequenceRecovery; error: string; status: 409 }
> {
  await ensureProjectCollaborationOperationSchema();

  if (input.operations.length === 0) {
    return { error: "Operation batch must contain at least one operation", status: 400 };
  }

  const access = await requireProjectRole(input.projectId, input.userId, "editor");

  if ("error" in access) {
    return access;
  }

  if (input.batchId) {
    const existingBatch = await findOperationBatchByBatchId(input.batchId);

    if (existingBatch) {
      if (!isMatchingOperationBatchRetry(existingBatch, input)) {
        return { error: "Operation batch id is already used for a different payload", status: 400 };
      }

      return { operationBatch: existingBatch };
    }
  }

  const existingCausalBatch = await findOperationBatchByCausalStamp(input);

  if (existingCausalBatch) {
    if (!isMatchingOperationBatchRetry(existingCausalBatch, input)) {
      return { error: "Collaboration client sequence is already used for a different payload", status: 400 };
    }

    return { operationBatch: existingCausalBatch };
  }

  const sequenceContinuity = await evaluateClientSequenceContinuity(input);

  if (sequenceContinuity.status === "gap") {
    const expectedSequence = sequenceContinuity.expectedSequence ?? sequenceContinuity.latestSequence + 1;

    return {
      clientSequenceRecovery: {
        clientId: input.clientId,
        expectedSequence,
        latestSequence: sequenceContinuity.latestSequence,
        rejectedSequence: input.clientSequence ?? 0,
      },
      error: `Missing collaboration client sequence ${expectedSequence} before ${input.clientSequence}`,
      status: 409,
    };
  }

  const now = new Date();
  const clientSequence = input.clientSequence ?? 0;
  const batchId = input.batchId ?? nanoid();
  const batch = {
    id: nanoid(),
    projectId: input.projectId,
    userId: input.userId,
    batchId,
    clientId: input.clientId,
    clientSequence,
    causalId: input.causalId ?? createCausalId(input.projectId, input.clientId, clientSequence, batchId),
    baseUpdatedAt: input.baseUpdatedAt ?? null,
    operations: input.operations,
    operationCount: input.operations.length,
    createdAt: now,
  };

  try {
    await getDb().insert(projectCollaborationOperationBatch).values(batch);
  } catch (error) {
    return resolveOperationBatchRetryAfterInsertFailure(input, error);
  }

  const rows = await getDb()
    .select(operationBatchSummarySelection)
    .from(projectCollaborationOperationBatch)
    .innerJoin(user, eq(projectCollaborationOperationBatch.userId, user.id))
    .where(eq(projectCollaborationOperationBatch.id, batch.id))
    .limit(1);

  const row = rows[0];

  if (!row) {
    return { error: "Operation batch could not be created", status: 400 };
  }

  return { operationBatch: toSummary(row) };
}
