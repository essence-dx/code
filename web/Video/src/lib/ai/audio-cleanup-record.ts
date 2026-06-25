import { z } from "zod";
import { aiGenerationAssetMetadata, logAiGenerationRecord, summarizeAiGenerationOutput } from "@/lib/ai/generation-records";
import { assertAiSafety, reviewAiTextSafety } from "@/lib/ai/safety";
import { assertAiUsageAllowed, logAiUsage } from "@/lib/ai/usage";
import { audioCleanupAdapterIds, audioCleanupModes, audioCleanupIntensity } from "@/lib/audio/cleanup-contract";

const dbMetricSchema = z.number().finite().min(-120).max(12);

const audioCleanupRecordSchema = z.object({
  projectId: z.string().max(160).optional(),
  sourceAssetName: z.string().min(1).max(180),
  outputAssetName: z.string().min(1).max(180),
  adapter: z.enum(audioCleanupAdapterIds),
  mode: z.enum(audioCleanupModes).optional(),
  intensity: z.number().finite().min(audioCleanupIntensity.min).max(audioCleanupIntensity.max).optional(),
  duration: z.number().finite().min(0).max(7200).optional(),
  before: z.object({
    peakDb: dbMetricSchema,
    rmsDb: dbMetricSchema,
    noiseFloorDb: dbMetricSchema,
  }),
  after: z.object({
    peakDb: dbMetricSchema,
    rmsDb: dbMetricSchema,
    noiseFloorDb: dbMetricSchema,
  }),
  summary: z.string().min(1).max(600),
});

export async function recordAiAudioCleanup(rawInput: unknown, context: { userId: string }) {
  const input = audioCleanupRecordSchema.parse(rawInput);
  const promptText = `Clean audio: ${input.sourceAssetName} -> ${input.outputAssetName}`;
  const safetyReview = reviewAiTextSafety({ action: "audio-cleanup", text: promptText });

  if (safetyReview.status === "blocked") {
    await logAiGenerationRecord({
      userId: context.userId,
      projectId: input.projectId,
      action: "audio-cleanup",
      provider: "safety",
      model: "preflight",
      status: "failed",
      safetyStatus: safetyReview.status,
      safetyReason: safetyReview.reason,
      promptText,
      promptChars: promptText.length,
      error: safetyReview.reason,
    });
  }
  assertAiSafety(safetyReview);
  await assertAiUsageAllowed(context.userId, "audio-cleanup", input.adapter);

  const output = {
    filename: input.outputAssetName,
    sourceAssetName: input.sourceAssetName,
    mode: input.mode,
    intensity: input.intensity,
    duration: input.duration,
    before: input.before,
    after: input.after,
    summary: input.summary,
  };
  const usageEventId = await logAiUsage({
    userId: context.userId,
    projectId: input.projectId,
    action: "audio-cleanup",
    model: input.adapter,
    status: "complete",
    promptChars: promptText.length,
    outputChars: JSON.stringify(output).length,
  });
  const asset = aiGenerationAssetMetadata("audio-cleanup", output);
  await logAiGenerationRecord({
    userId: context.userId,
    projectId: input.projectId,
    usageEventId,
    action: "audio-cleanup",
    provider: "local",
    model: input.adapter,
    status: "complete",
    safetyStatus: safetyReview.status,
    safetyReason: safetyReview.reason,
    promptText,
    promptChars: promptText.length,
    outputChars: JSON.stringify(output).length,
    outputSummary: summarizeAiGenerationOutput("audio-cleanup", output),
    outputAssetKind: asset.kind,
    outputAssetName: asset.name,
  });

  return {
    ok: true as const,
    provider: "local" as const,
    model: input.adapter,
    output,
  };
}
