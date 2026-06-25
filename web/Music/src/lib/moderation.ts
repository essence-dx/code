import { z } from "zod";

export const moderationStatusSchema = z.enum([
  "clean",
  "pending-review",
  "hidden",
]);

export const reportTargetTypeSchema = z.enum([
  "song",
  "profile",
  "playlist",
  "comment",
  "hook",
]);

export const reportReasonSchema = z.enum([
  "spam",
  "harassment",
  "hate",
  "unsafe",
  "privacy",
  "copyright",
  "other",
]);

export const reportStatusSchema = z.enum([
  "open",
  "reviewing",
  "actioned",
  "dismissed",
]);

export const reportReasonLabels: Record<z.infer<typeof reportReasonSchema>, string> = {
  copyright: "Copyright or ownership",
  harassment: "Harassment",
  hate: "Hate or abusive content",
  other: "Other",
  privacy: "Privacy or personal data",
  spam: "Spam or misleading",
  unsafe: "Unsafe content",
};

type PublicSongMetadata = {
  artist: string;
  lyrics: string;
  stylePrompt: string;
  tags: string[];
  title: string;
};

const highRiskMetadataRules = [
  {
    label: "self-harm instruction",
    pattern: /\b(kill yourself|suicide instruction|self-harm guide)\b/i,
  },
  {
    label: "sexual content involving minors",
    pattern: /\b(child sexual|minor sexual|csam)\b/i,
  },
  {
    label: "doxxing or targeted abuse",
    pattern: /\b(doxx|swat someone|targeted harassment)\b/i,
  },
  {
    label: "credential theft",
    pattern: /\b(stolen password|credential dump|credit card dump)\b/i,
  },
];

export function scanPublicSongMetadata(song: PublicSongMetadata) {
  const text = [
    song.title,
    song.artist,
    song.stylePrompt,
    song.lyrics,
    song.tags.join(" "),
  ]
    .join("\n")
    .toLowerCase();

  return highRiskMetadataRules
    .filter((rule) => rule.pattern.test(text))
    .map((rule) => rule.label);
}

export function isResolvedReportStatus(
  status: z.infer<typeof reportStatusSchema>,
) {
  return status === "actioned" || status === "dismissed";
}
