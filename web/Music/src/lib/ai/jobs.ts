import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  aiGenerations,
  aiJobs,
  providerEvents,
  type AiJobKind,
} from "@/db/schema";

type JobStatus = "queued" | "running" | "succeeded" | "failed" | "disabled";

export async function recordAiJob(input: {
  kind: AiJobKind;
  status: JobStatus;
  provider: string;
  model?: string;
  request?: unknown;
  output?: unknown;
  error?: string;
}) {
  const id = nanoid();
  await getDb().insert(aiJobs).values({
    id,
    kind: input.kind,
    status: input.status,
    provider: input.provider,
    model: input.model ?? "",
    input: input.request,
    output: input.output,
    error: input.error,
  });

  return id;
}

export async function updateAiJob(
  id: string,
  input: {
    status: JobStatus;
    output?: unknown;
    error?: string;
  },
) {
  await getDb()
    .update(aiJobs)
    .set({
      status: input.status,
      output: input.output,
      error: input.error,
      updatedAt: new Date(),
    })
    .where(eq(aiJobs.id, id));
}

export async function tryRecordAiJob(input: Parameters<typeof recordAiJob>[0]) {
  try {
    return await recordAiJob(input);
  } catch (error) {
    console.error("Failed to record AI job", error);
    return undefined;
  }
}

export async function tryUpdateAiJob(
  id: string,
  input: Parameters<typeof updateAiJob>[1],
) {
  try {
    await updateAiJob(id, input);
  } catch (error) {
    console.error("Failed to update AI job", error);
  }
}

export async function recordGeneration(input: {
  jobId: string;
  contentType: string;
  content: string;
}) {
  await getDb().insert(aiGenerations).values({
    id: nanoid(),
    jobId: input.jobId,
    contentType: input.contentType,
    content: input.content,
  });
}

export async function tryRecordGeneration(
  input: Parameters<typeof recordGeneration>[0],
) {
  try {
    await recordGeneration(input);
  } catch (error) {
    console.error("Failed to record AI generation", error);
  }
}

export async function recordProviderEvent(input: {
  jobId?: string;
  provider: string;
  eventType: string;
  payload?: unknown;
}) {
  await getDb().insert(providerEvents).values({
    id: nanoid(),
    jobId: input.jobId,
    provider: input.provider,
    eventType: input.eventType,
    payload: input.payload,
  });
}

export async function tryRecordProviderEvent(
  input: Parameters<typeof recordProviderEvent>[0],
) {
  try {
    await recordProviderEvent(input);
  } catch (error) {
    console.error("Failed to record provider event", error);
  }
}
