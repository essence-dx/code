import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  createProjectCollaborationClientCursors,
  mergeProjectCollaborationClientCursors,
  parseProjectCollaborationClientCursorsParam,
} from "@/features/projects/collaboration-client-cursors";
import { createProjectCollaborationReplayCheckpoint } from "@/features/projects/collaboration-replay-checkpoint";
import { projectCollaborationOperationQuerySchema } from "@/features/projects/collaboration-types";
import { listProjectCollaborationOperationBatches } from "@/features/projects/server/project-collaboration-operation-service";

export const dynamic = "force-dynamic";

const streamDurationMs = 30_000;
const streamPollMs = 3_000;
const cursorOverlapMs = 1;

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

function parseOptionalDate(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

function createOverlappingCursor(value: string | Date | null) {
  if (!value) {
    return null;
  }

  const date = typeof value === "string" ? new Date(value) : value;
  return new Date(Math.max(0, date.getTime() - cursorOverlapMs));
}

function encodeStreamEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function writeStreamEvent(controller: ReadableStreamDefaultController<Uint8Array>, event: string, data: unknown) {
  controller.enqueue(new TextEncoder().encode(encodeStreamEvent(event, data)));
}

export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionUserId = userId;
  const requestUrl = new URL(request.url);
  const query = projectCollaborationOperationQuerySchema.safeParse({
    after: requestUrl.searchParams.get("after") ?? undefined,
    clientCursors: requestUrl.searchParams.get("clientCursors") ?? undefined,
  });

  if (!query.success) {
    return Response.json({ error: "Invalid collaboration stream query" }, { status: 400 });
  }

  const { projectId } = await context.params;
  let cursor = createOverlappingCursor(parseOptionalDate(query.data.after));
  let clientCursors = parseProjectCollaborationClientCursorsParam(query.data.clientCursors);
  const initialResult = await listProjectCollaborationOperationBatches({
    after: cursor,
    clientCursors,
    projectId,
    userId: sessionUserId,
  });

  if ("error" in initialResult) {
    return Response.json({ error: initialResult.error }, { status: initialResult.status });
  }

  const initialBatches = initialResult.operationBatches;
  const initialLastBatch = initialBatches.at(-1);
  let replayCursor = query.data.after ?? null;
  clientCursors = mergeProjectCollaborationClientCursors(clientCursors, createProjectCollaborationClientCursors(initialBatches));

  if (initialLastBatch) {
    replayCursor = initialLastBatch.createdAt;
    cursor = createOverlappingCursor(initialLastBatch.createdAt);
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let interval: ReturnType<typeof setInterval> | null = null;
      let timeout: ReturnType<typeof setTimeout> | null = null;
      const sentBatchIds = new Set(initialBatches.map((batch) => batch.id));

      function close() {
        if (closed) {
          return;
        }

        closed = true;
        if (interval) {
          clearInterval(interval);
        }
        if (timeout) {
          clearTimeout(timeout);
        }
        controller.close();
      }

      async function poll() {
        if (closed) {
          return;
        }

        try {
          const result = await listProjectCollaborationOperationBatches({
            after: cursor,
            clientCursors,
            projectId,
            userId: sessionUserId,
          });

          if ("error" in result) {
            writeStreamEvent(controller, "error", { error: result.error });
            close();
            return;
          }

          const newBatches = result.operationBatches.filter((batch) => !sentBatchIds.has(batch.id));
          const lastBatch = result.operationBatches.at(-1);
          clientCursors = mergeProjectCollaborationClientCursors(clientCursors, createProjectCollaborationClientCursors(result.operationBatches));

          if (lastBatch) {
            replayCursor = lastBatch.createdAt;
            cursor = createOverlappingCursor(lastBatch.createdAt);
          }

          const checkedAt = new Date().toISOString();
          const replayCheckpoint = createProjectCollaborationReplayCheckpoint({
            checkedAt,
            clientCursors,
            operationBatches: result.operationBatches,
            previousStreamCursor: replayCursor,
          });

          if (newBatches.length > 0) {
            for (const batch of newBatches) {
              sentBatchIds.add(batch.id);
            }

            writeStreamEvent(controller, "operation-batches", {
              checkedAt,
              clientCursors,
              operationBatches: newBatches,
              replayCheckpoint,
            });
          } else {
            writeStreamEvent(controller, "heartbeat", { checkedAt, clientCursors, replayCheckpoint });
          }
        } catch (error) {
          writeStreamEvent(controller, "error", { error: error instanceof Error ? error.message : "Collaboration stream failed" });
          close();
        }
      }

      const connectedAt = new Date().toISOString();
      writeStreamEvent(controller, "connected", {
        checkedAt: connectedAt,
        clientCursors,
        replayCheckpoint: createProjectCollaborationReplayCheckpoint({
          checkedAt: connectedAt,
          clientCursors,
          previousStreamCursor: replayCursor,
        }),
      });
      if (initialBatches.length > 0) {
        const checkedAt = new Date().toISOString();
        writeStreamEvent(controller, "operation-batches", {
          checkedAt,
          clientCursors,
          operationBatches: initialBatches,
          replayCheckpoint: createProjectCollaborationReplayCheckpoint({
            checkedAt,
            clientCursors,
            operationBatches: initialBatches,
            previousStreamCursor: replayCursor,
          }),
        });
      }

      interval = setInterval(() => {
        void poll();
      }, streamPollMs);
      timeout = setTimeout(close, streamDurationMs);
      request.signal.addEventListener("abort", close, { once: true });
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    },
  });
}
