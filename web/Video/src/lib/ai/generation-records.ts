import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { aiGenerationRecords } from "@/lib/db/schema";
import type { AiUsageAction } from "@/lib/ai/schemas";
import type { AiSafetyStatus } from "@/lib/ai/safety";

export type AiGenerationStatus = "complete" | "failed" | "rate_limited";
export type AiGenerationAssetKind = "none" | "caption" | "image" | "audio" | "video" | "project" | "stock";

export interface AiGenerationRecordInput {
  userId: string;
  projectId?: string;
  usageEventId?: string;
  action: AiUsageAction;
  provider: string;
  model: string;
  status: AiGenerationStatus;
  safetyStatus: AiSafetyStatus;
  safetyReason?: string;
  promptText: string;
  promptChars: number;
  outputChars?: number;
  outputSummary?: string;
  outputAssetKind?: AiGenerationAssetKind;
  outputAssetName?: string;
  error?: string;
}

export interface PublicAiGenerationRecord {
  action: AiUsageAction;
  provider: string;
  model: string;
  status: AiGenerationStatus;
  safetyStatus: AiSafetyStatus;
  safetyReason?: string;
  promptPreview: string;
  outputSummary?: string;
  outputAssetKind: AiGenerationAssetKind;
  outputAssetName?: string;
  createdAt: string;
}

export async function logAiGenerationRecord(input: AiGenerationRecordInput) {
  try {
    await insertAiGenerationRecord(input, input.projectId);
    return true;
  } catch (error) {
    if (input.projectId) {
      try {
        await insertAiGenerationRecord(input, undefined);
        return true;
      } catch (fallbackError) {
        console.error("AI generation record could not be saved", fallbackError);
        return false;
      }
    }

    console.error("AI generation record could not be saved", error);
    return false;
  }
}

export async function getAiGenerationReview(userId: string) {
  const rows = await getDb()
    .select({
      action: aiGenerationRecords.action,
      provider: aiGenerationRecords.provider,
      model: aiGenerationRecords.model,
      status: aiGenerationRecords.status,
      safetyStatus: aiGenerationRecords.safetyStatus,
      safetyReason: aiGenerationRecords.safetyReason,
      promptText: aiGenerationRecords.promptText,
      outputSummary: aiGenerationRecords.outputSummary,
      outputAssetKind: aiGenerationRecords.outputAssetKind,
      outputAssetName: aiGenerationRecords.outputAssetName,
      createdAt: aiGenerationRecords.createdAt,
    })
    .from(aiGenerationRecords)
    .where(eq(aiGenerationRecords.userId, userId))
    .orderBy(desc(aiGenerationRecords.createdAt))
    .limit(12);

  return rows.map((row) => ({
    action: row.action,
    provider: row.provider,
    model: row.model,
    status: row.status,
    safetyStatus: row.safetyStatus,
    safetyReason: row.safetyReason ?? undefined,
    promptPreview: previewText(row.promptText, 180),
    outputSummary: row.outputSummary ?? undefined,
    outputAssetKind: row.outputAssetKind,
    outputAssetName: row.outputAssetName ?? undefined,
    createdAt: row.createdAt.toISOString(),
  })) satisfies PublicAiGenerationRecord[];
}

export function summarizeAiGenerationOutput(action: AiUsageAction, output: unknown) {
  if (!isRecord(output)) return `${action} completed.`;

  if ((action === "image" || action === "image-edit") && Array.isArray(output.images)) {
    const verb = action === "image-edit" ? "edited" : "generated";
    return `${output.images.length} image asset${output.images.length === 1 ? "" : "s"} ${verb}.`;
  }

  if (action === "voiceover" && typeof output.filename === "string") {
    return `Voiceover generated: ${output.filename}.`;
  }

  if (action === "audio-cleanup" && typeof output.filename === "string") {
    return `Cleaned audio generated: ${output.filename}.`;
  }

  if (action === "video-enhancement" && typeof output.filename === "string") {
    return `Enhanced video generated: ${output.filename}.`;
  }

  if (action === "scene-video" && typeof output.filename === "string") {
    return `Scene video generated: ${output.filename}.`;
  }

  if (action === "captions" && Array.isArray(output.captions)) {
    return `${output.captions.length} caption cue${output.captions.length === 1 ? "" : "s"} generated.`;
  }

  if (action === "b-roll" && Array.isArray(output.suggestions)) {
    return `${output.suggestions.length} B-roll suggestion${output.suggestions.length === 1 ? "" : "s"} generated.`;
  }

  if (action === "video-project" && Array.isArray(output.scenes)) {
    return `${output.scenes.length} scene video project generated.`;
  }

  if (action === "repurpose" && Array.isArray(output.clips)) {
    return `${output.clips.length} clip variant suggestion${output.clips.length === 1 ? "" : "s"} generated.`;
  }

  return `${action} output generated.`;
}

export function aiGenerationAssetMetadata(action: AiUsageAction, output: unknown): { kind: AiGenerationAssetKind; name?: string } {
  if (!isRecord(output)) return { kind: "none" };
  if ((action === "image" || action === "image-edit") && Array.isArray(output.images)) {
    const firstImage = output.images.find(isRecord);
    return { kind: "image", name: typeof firstImage?.filename === "string" ? firstImage.filename : undefined };
  }
  if (action === "voiceover" && typeof output.filename === "string") return { kind: "audio", name: output.filename };
  if (action === "audio-cleanup" && typeof output.filename === "string") return { kind: "audio", name: output.filename };
  if (action === "video-enhancement" && typeof output.filename === "string") return { kind: "video", name: output.filename };
  if (action === "scene-video" && typeof output.filename === "string") return { kind: "video", name: output.filename };
  if (action === "captions") return { kind: "caption" };
  if (action === "video-project" && typeof output.title === "string") return { kind: "project", name: output.title };
  if (action === "b-roll") return { kind: "stock" };
  return { kind: "none" };
}

export function promptForGenerationRecord(value: string | undefined) {
  return previewText(value ?? "", 4000);
}

async function insertAiGenerationRecord(input: AiGenerationRecordInput, projectId: string | undefined) {
  await getDb().insert(aiGenerationRecords).values({
    id: `ai_generation_${crypto.randomUUID()}`,
    userId: input.userId,
    projectId,
    usageEventId: input.usageEventId,
    action: input.action,
    provider: input.provider,
    model: input.model,
    status: input.status,
    safetyStatus: input.safetyStatus,
    safetyReason: input.safetyReason,
    promptText: promptForGenerationRecord(input.promptText),
    promptChars: input.promptChars,
    outputChars: input.outputChars ?? 0,
    outputSummary: input.outputSummary ? previewText(input.outputSummary, 500) : undefined,
    outputAssetKind: input.outputAssetKind ?? "none",
    outputAssetName: input.outputAssetName,
    error: input.error,
    createdAt: new Date(),
  });
}

function previewText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
