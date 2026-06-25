import { z } from "zod";

export const songRightsLicenseSchema = z.enum([
  "all-rights-reserved",
  "cc-by",
  "cc-by-sa",
  "cc-by-nc",
  "public-domain",
  "custom",
  "unknown",
]);

export type SongRightsLicense = z.infer<typeof songRightsLicenseSchema>;

export const songRightsMetadataSchema = z.object({
  aiAssisted: z.boolean().default(false),
  attribution: z.string().max(500).default(""),
  commercialUseAllowed: z.boolean().default(false),
  confirmedAt: z.string().optional(),
  copyrightOwner: z.string().max(160).default(""),
  license: songRightsLicenseSchema.default("unknown"),
  notes: z.string().max(1000).default(""),
  originalWork: z.boolean().default(false),
  rightsConfirmed: z.boolean().default(false),
  sourceProvenance: z.string().max(700).default(""),
  thirdPartySamples: z.boolean().default(false),
});

export type SongRightsMetadata = z.infer<typeof songRightsMetadataSchema>;
type SongRightsSource = "ai" | "edit" | "import" | "recording" | "upload";

export type SongRightsReadiness = {
  issues: string[];
  ready: boolean;
  summary: string;
};

export function defaultSongRightsMetadata(
  source: SongRightsSource,
  sourceProvenance = "",
): SongRightsMetadata {
  const base = normalizeSongRightsMetadata({ sourceProvenance });

  if (source === "recording") {
    return {
      ...base,
      originalWork: true,
      sourceProvenance: sourceProvenance || "Browser recording",
    };
  }

  if (source === "ai") {
    return {
      ...base,
      aiAssisted: true,
      sourceProvenance: sourceProvenance || "Configured generation provider",
    };
  }

  if (source === "edit") {
    return {
      ...base,
      sourceProvenance: sourceProvenance || "Edited from a library track",
    };
  }

  if (source === "import") {
    return {
      ...base,
      sourceProvenance: sourceProvenance || "Imported metadata",
    };
  }

  return {
    ...base,
    sourceProvenance: sourceProvenance || "Uploaded audio file",
  };
}

export function normalizeSongRightsMetadata(
  value: unknown,
): SongRightsMetadata {
  const parsed = songRightsMetadataSchema.safeParse(value);

  if (parsed.success) {
    return parsed.data;
  }

  return songRightsMetadataSchema.parse({});
}

export function getSongRightsReadiness(
  metadata: SongRightsMetadata | undefined,
): SongRightsReadiness {
  const rights = normalizeSongRightsMetadata(metadata);
  const issues: string[] = [];

  if (!rights.rightsConfirmed) {
    issues.push("Confirm that you have the rights to share this track.");
  }

  if (!rights.copyrightOwner.trim()) {
    issues.push("Add the copyright owner or rights holder.");
  }

  if (rights.license === "unknown") {
    issues.push("Choose a license or release policy.");
  }

  if (rights.thirdPartySamples && !rights.attribution.trim()) {
    issues.push("Add attribution for third-party samples.");
  }

  if (!rights.sourceProvenance.trim()) {
    issues.push("Describe where the audio came from.");
  }

  return {
    issues,
    ready: issues.length === 0,
    summary: issues.length
      ? issues[0]
      : rights.commercialUseAllowed
        ? "Rights cleared for commercial release."
        : "Rights confirmed for non-commercial sharing.",
  };
}

export function rightsLicenseLabel(value: SongRightsLicense) {
  const labels: Record<SongRightsLicense, string> = {
    "all-rights-reserved": "All rights reserved",
    "cc-by": "Creative Commons BY",
    "cc-by-nc": "Creative Commons BY-NC",
    "cc-by-sa": "Creative Commons BY-SA",
    custom: "Custom license",
    "public-domain": "Public domain",
    unknown: "Unknown",
  };

  return labels[value];
}
