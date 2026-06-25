import type { ProviderContractSnapshot } from "./provider-contracts";
import type { JobReplayDraft } from "./job-replay-drafts";

export type JobProvenanceField = {
  label: string;
  value: string;
};

export type JobProvenanceAsset = {
  mediaType: string;
  metadata: JobProvenanceField[];
  title: string;
  type: string;
};

export type JobProvenance = {
  assets: JobProvenanceAsset[];
  contract: {
    capturedAt: string;
    ready: number;
    score: number;
    total: number;
  } | null;
  output: JobProvenanceField[];
  request: JobProvenanceField[];
};

type AssetInput = {
  mediaType: string;
  textContent: string;
  title: string;
  type: string;
};

const sensitiveKeyPattern =
  /(api|auth|audioDataBase64|base64|content|key|secret|sourceAudioDataBase64|token)/i;

const requestFieldLabels: Record<string, string> = {
  continuationPrompt: "Continuation",
  creativeControls: "Creative controls",
  directionPrompt: "Direction",
  durationMs: "Duration",
  extendFromMs: "Extend from",
  lyrics: "Lyrics",
  maxExtensionMs: "Max extension",
  mode: "Mode",
  notes: "Notes",
  prompt: "Prompt",
  region: "Region",
  sourceKind: "Source kind",
  sourceMediaType: "Source media",
  sourceSongId: "Source song",
  sourceStyle: "Source style",
  sourceTitle: "Source",
  style: "Style",
  targetStyle: "Target style",
  title: "Title",
  variantCount: "Takes",
  variantGroupId: "Variant set",
  variantIndex: "Take",
  voiceProfile: "Voice profile",
};

const outputFieldLabels: Record<string, string> = {
  hasInlineAudio: "Inline audio",
  mediaType: "Media type",
  providerJobId: "Provider job",
  title: "Title",
};

export function buildJobProvenance(input: {
  assets?: AssetInput[];
  output: unknown;
  request: unknown;
}): JobProvenance {
  return {
    assets: buildAssetProvenance(input.assets ?? []),
    contract: parseProviderContract(input.request),
    output: objectToFields(input.output, outputFieldLabels, {
      includeUnknown: false,
    }),
    request: objectToFields(input.request, requestFieldLabels, {
      includeUnknown: false,
      skipKeys: new Set(["providerContract"]),
    }),
  };
}

export function serializeJobProvenance(job: {
  createdAt: string | number;
  id: string;
  kind: string;
  model: string;
  provenance: JobProvenance | null;
  provider: string;
  replayDraft?: JobReplayDraft | null;
  status: string;
}) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      job: {
        createdAt: job.createdAt,
        id: job.id,
        kind: job.kind,
        model: job.model,
        provider: job.provider,
        status: job.status,
      },
      provenance: job.provenance,
      replayDraft: job.replayDraft ?? null,
      type: "essence-suno-job-provenance",
      version: 1,
    },
    null,
    2,
  );
}

function buildAssetProvenance(assets: AssetInput[]): JobProvenanceAsset[] {
  return assets.map((asset) => ({
    mediaType: asset.mediaType,
    metadata: objectToFields(parseJson(asset.textContent), requestFieldLabels, {
      includeUnknown: true,
    }).slice(0, 12),
    title: asset.title,
    type: asset.type,
  }));
}

function parseProviderContract(input: unknown): JobProvenance["contract"] {
  if (!input || typeof input !== "object") {
    return null;
  }

  const contract = (input as { providerContract?: unknown }).providerContract;

  if (!contract || typeof contract !== "object") {
    return null;
  }

  const value = contract as Partial<ProviderContractSnapshot>;
  const features = Array.isArray(value.features) ? value.features : [];
  const ready = features.filter((feature) => feature.ready).length;

  return {
    capturedAt:
      typeof value.capturedAt === "string" ? value.capturedAt : "",
    ready,
    score: typeof value.score === "number" && Number.isFinite(value.score)
      ? value.score
      : 0,
    total: features.length,
  };
}

function objectToFields(
  input: unknown,
  labels: Record<string, string>,
  options: { includeUnknown: boolean; skipKeys?: Set<string> },
): JobProvenanceField[] {
  if (!input || typeof input !== "object") {
    return [];
  }

  return Object.entries(input as Record<string, unknown>)
    .filter(([key, value]) => {
      if (options.skipKeys?.has(key)) {
        return false;
      }

      if (sensitiveKeyPattern.test(key)) {
        return false;
      }

      if (!options.includeUnknown && !(key in labels)) {
        return false;
      }

      return value !== undefined && value !== null && value !== "";
    })
    .map(([key, value]) => ({
      label: labels[key] ?? toTitle(key),
      value: formatValue(key, value),
    }))
    .filter((field) => field.value.length > 0);
}

function formatValue(key: string, value: unknown): string {
  if (key.endsWith("Ms") && typeof value === "number") {
    return `${Math.round(value / 1000)} sec`;
  }

  if (typeof value === "string") {
    return truncate(value, 320);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return truncate(value.map((item) => formatNestedValue(item)).join(", "), 320);
  }

  if (value && typeof value === "object") {
    return truncate(formatObject(value as Record<string, unknown>), 320);
  }

  return "";
}

function formatObject(value: Record<string, unknown>) {
  return Object.entries(value)
    .filter(([key, item]) => !sensitiveKeyPattern.test(key) && item !== "")
    .map(([key, item]) => `${toTitle(key)}: ${formatNestedValue(item)}`)
    .join(" / ");
}

function formatNestedValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return formatObject(value as Record<string, unknown>);
  }

  return "";
}

function parseJson(value: string) {
  if (!value.trim().startsWith("{")) {
    return {};
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return {};
  }
}

function toTitle(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength
    ? `${value.slice(0, Math.max(0, maxLength - 3))}...`
    : value;
}
