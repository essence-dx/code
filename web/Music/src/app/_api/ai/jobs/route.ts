import { desc, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { aiJobs, generatedAssets } from "@/db/schema";
import { buildJobProvenance } from "@/lib/ai/job-provenance";
import { buildJobReplayDraft } from "@/lib/ai/job-replay-drafts";
import { normalizeRouteError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await getDb()
      .select({
        id: aiJobs.id,
        kind: aiJobs.kind,
        status: aiJobs.status,
        provider: aiJobs.provider,
        model: aiJobs.model,
        error: aiJobs.error,
        input: aiJobs.input,
        output: aiJobs.output,
        createdAt: aiJobs.createdAt,
        updatedAt: aiJobs.updatedAt,
      })
      .from(aiJobs)
      .orderBy(desc(aiJobs.createdAt))
      .limit(20);
    const assetsByJobId = await getAssetsByJobId(rows.map((job) => job.id));

    const jobs = rows.map((job) => ({
      error: job.error,
      id: job.id,
      kind: job.kind,
      model: job.model,
      provider: job.provider,
      queue:
        job.kind === "audio" ? summarizeAudioQueue(job.input, job.output) : null,
      provenance: buildJobProvenance({
        assets: assetsByJobId.get(job.id) ?? [],
        output: job.output,
        request: job.input,
      }),
      replayDraft: buildJobReplayDraft(job.kind, job.input),
      status: job.status,
      createdAt:
        job.createdAt instanceof Date ? job.createdAt.toISOString() : job.createdAt,
      updatedAt:
        job.updatedAt instanceof Date ? job.updatedAt.toISOString() : job.updatedAt,
    }));
    const summary = jobs.reduce(
      (counts, job) => ({
        ...counts,
        [job.status]: (counts[job.status] ?? 0) + 1,
      }),
      {} as Record<string, number>,
    );

    return NextResponse.json({ jobs, summary });
  } catch (error) {
    return normalizeRouteError(error);
  }
}

async function getAssetsByJobId(jobIds: string[]) {
  const assetsByJobId = new Map<
    string,
    Array<{
      mediaType: string;
      textContent: string;
      title: string;
      type: string;
    }>
  >();

  if (!jobIds.length) {
    return assetsByJobId;
  }

  const rows = await getDb()
    .select({
      jobId: generatedAssets.jobId,
      mediaType: generatedAssets.mediaType,
      textContent: generatedAssets.textContent,
      title: generatedAssets.title,
      type: generatedAssets.type,
    })
    .from(generatedAssets)
    .where(inArray(generatedAssets.jobId, jobIds));

  for (const asset of rows) {
    if (!asset.jobId) {
      continue;
    }

    assetsByJobId.set(asset.jobId, [
      ...(assetsByJobId.get(asset.jobId) ?? []),
      {
        mediaType: asset.mediaType,
        textContent: asset.textContent,
        title: asset.title,
        type: asset.type,
      },
    ]);
  }

  return assetsByJobId;
}

function summarizeAudioQueue(input: unknown, output: unknown) {
  const request = parseAudioRequest(input);
  const audio = parseAudioOutput(output);

  return {
    ...request,
    audioAvailable: Boolean(audio.audioUrl),
    audioTitle: audio.title,
    audioUrl: audio.audioUrl,
    mediaType: audio.mediaType,
  };
}

function parseAudioRequest(input: unknown) {
  if (!input || typeof input !== "object") {
    return {
      prompt: "",
      lyrics: "",
      style: "",
      title: "Untitled generation",
      variantCount: 1,
      variantGroupId: "",
      variantIndex: 1,
      voiceProfile: null,
    };
  }

  const value = input as {
    prompt?: unknown;
    lyrics?: unknown;
    style?: unknown;
    title?: unknown;
    variantCount?: unknown;
    variantGroupId?: unknown;
    variantIndex?: unknown;
    voiceProfile?: unknown;
  };

  return {
    prompt: typeof value.prompt === "string" ? value.prompt : "",
    lyrics: typeof value.lyrics === "string" ? value.lyrics : "",
    style: typeof value.style === "string" ? value.style : "",
    title: typeof value.title === "string" ? value.title : "Untitled generation",
    variantCount:
      typeof value.variantCount === "number" && Number.isFinite(value.variantCount)
        ? value.variantCount
        : 1,
    variantGroupId:
      typeof value.variantGroupId === "string" ? value.variantGroupId : "",
    variantIndex:
      typeof value.variantIndex === "number" && Number.isFinite(value.variantIndex)
        ? value.variantIndex
        : 1,
    voiceProfile: parseVoiceProfile(value.voiceProfile),
  };
}

function parseVoiceProfile(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const profile = value as {
    id?: unknown;
    name?: unknown;
    rightsConfirmed?: unknown;
    sampleSummary?: unknown;
    summary?: unknown;
  };

  return {
    id: typeof profile.id === "string" ? profile.id : "",
    name: typeof profile.name === "string" ? profile.name : "",
    rightsConfirmed:
      typeof profile.rightsConfirmed === "boolean"
        ? profile.rightsConfirmed
        : false,
    sampleSummary:
      typeof profile.sampleSummary === "string" ? profile.sampleSummary : "",
    summary: typeof profile.summary === "string" ? profile.summary : "",
  };
}

function parseAudioOutput(output: unknown) {
  if (!output || typeof output !== "object") {
    return { audioUrl: "", mediaType: "", title: "" };
  }

  const value = output as {
    assetUrl?: unknown;
    audio_url?: unknown;
    audioUrl?: unknown;
    mimeType?: unknown;
    mediaType?: unknown;
    title?: unknown;
    url?: unknown;
  };
  const audioUrl = [value.audioUrl, value.audio_url, value.assetUrl, value.url].find(
    (item) => typeof item === "string",
  );
  const mediaType = [value.mediaType, value.mimeType].find(
    (item) => typeof item === "string",
  );

  return {
    audioUrl: typeof audioUrl === "string" ? audioUrl : "",
    mediaType: typeof mediaType === "string" ? mediaType : "",
    title: typeof value.title === "string" ? value.title : "",
  };
}
