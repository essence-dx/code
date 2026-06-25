import { z } from "zod";

export const providerCapabilitySchema = z.object({
  disabledReason: z.string(),
  env: z.array(z.string()),
  group: z.enum(["writing", "media", "music", "voice", "studio"]),
  id: z.string(),
  label: z.string(),
  requirement: z.string(),
  state: z.enum(["ready", "disabled"]),
  summary: z.string(),
});

export const providerCapabilitySummarySchema = z.object({
  disabled: z.number(),
  ready: z.number(),
  score: z.number(),
  total: z.number(),
});

export const aiProviderStatusSchema = z.object({
  text: z.boolean(),
  image: z.boolean(),
  transcription: z.boolean(),
  audio: z.boolean(),
  textModel: z.string(),
  imageModel: z.string(),
  backend: z.string(),
  structuredTextModel: z.string(),
  capabilities: z.array(providerCapabilitySchema).default([]),
  capabilitySummary: providerCapabilitySummarySchema.default({
    disabled: 0,
    ready: 0,
    score: 0,
    total: 0,
  }),
});

export const lyricRequestSchema = z.object({
  theme: z.string().min(2).max(500),
  style: z.string().min(2).max(500),
  mood: z.string().max(160).optional().default("focused"),
  structure: z
    .enum(["short", "verse-chorus", "full-song", "hook-first"])
    .default("verse-chorus"),
});

export const styleRequestSchema = z.object({
  idea: z.string().min(2).max(700),
  references: z.string().max(1200).optional().default(""),
});

export const songBriefRequestSchema = z.object({
  title: z.string().max(120).optional().default("Untitled"),
  lyrics: z.string().max(5000).optional().default(""),
  style: z.string().max(1000).optional().default(""),
  intention: z.string().max(700).optional().default(""),
});

export const hookCaptionRequestSchema = z.object({
  songTitle: z.string().min(1).max(120),
  mood: z.string().max(160).optional().default("cinematic"),
  moment: z.string().max(500).optional().default("best chorus moment"),
});

export const coverArtRequestSchema = z.object({
  title: z.string().min(1).max(120),
  style: z.string().max(1000).optional().default(""),
  lyrics: z.string().max(3000).optional().default(""),
  generateImage: z.boolean().optional().default(false),
});

export const metadataRequestSchema = z.object({
  title: z.string().max(120).optional().default("Untitled"),
  lyrics: z.string().max(5000).optional().default(""),
  style: z.string().max(1000).optional().default(""),
});

export const playlistInspirationRequestSchema = z.object({
  librarySummary: z.string().max(4000).optional().default(""),
  mood: z.string().max(160).optional().default("focused"),
});

export const defaultCreativeControls = {
  referenceInfluence: 40,
  structure: 55,
  weirdness: 35,
} as const;

export const creativeControlsSchema = z
  .object({
    referenceInfluence: z.number().int().min(0).max(100).default(
      defaultCreativeControls.referenceInfluence,
    ),
    structure: z.number().int().min(0).max(100).default(
      defaultCreativeControls.structure,
    ),
    weirdness: z.number().int().min(0).max(100).default(
      defaultCreativeControls.weirdness,
    ),
  })
  .default(defaultCreativeControls);

export const audioJobRequestSchema = z.object({
  title: z.string().min(1).max(120),
  prompt: z.string().min(2).max(2000),
  style: z.string().max(1000).optional().default(""),
  lyrics: z.string().max(5000).optional().default(""),
  creativeControls: creativeControlsSchema,
  voiceProfile: z
    .object({
      id: z.string().min(1).max(160),
      name: z.string().min(1).max(120),
      rightsConfirmed: z.boolean(),
      sampleSummary: z.string().max(500),
      summary: z.string().max(500),
    })
    .nullable()
    .optional(),
  variantCount: z.number().int().min(1).max(4).optional().default(1),
  variantGroupId: z.string().min(1).max(160).optional(),
  variantIndex: z.number().int().min(1).max(4).optional().default(1),
});

export const audioJobCallbackSchema = z.object({
  status: z.enum(["running", "succeeded", "failed"]),
  providerJobId: z.string().max(240).optional(),
  audioUrl: z.string().url().optional(),
  audioDataBase64: z.string().optional(),
  mediaType: z.string().min(1).max(120).optional().default("audio/mpeg"),
  title: z.string().max(160).optional(),
  error: z.string().max(1000).optional(),
  metadata: z.unknown().optional(),
});

export const sampleJobRequestSchema = z.object({
  durationMs: z.number().int().min(1000).max(30_000).default(8000),
  prompt: z.string().min(2).max(2000),
  creativeControls: creativeControlsSchema,
  sourceContext: z
    .object({
      originalWork: z.boolean().optional().default(false),
      rightsConfirmed: z.boolean().optional().default(false),
      sourceSongId: z.string().max(160).optional().default(""),
      sourceTitle: z.string().max(160).optional().default(""),
      summary: z.string().max(1000).optional().default(""),
      tags: z.array(z.string().max(80)).max(24).optional().default([]),
    })
    .optional(),
  style: z.string().max(1000).optional().default(""),
  title: z.string().min(1).max(120),
});

export const sampleJobCallbackSchema = z.object({
  status: z.enum(["running", "succeeded", "failed"]),
  providerJobId: z.string().max(240).optional(),
  audioUrl: z.string().url().optional(),
  audioDataBase64: z.string().optional(),
  mediaType: z.string().min(1).max(120).optional().default("audio/mpeg"),
  title: z.string().max(160).optional(),
  error: z.string().max(1000).optional(),
  metadata: z.unknown().optional(),
});

export const stemTypeSchema = z.enum([
  "vocals",
  "instrumental",
  "drums",
  "bass",
  "guitar",
  "piano",
  "other",
]);

export const stemJobRequestSchema = z.object({
  sourceSongId: z.string().min(1).max(160),
  sourceTitle: z.string().min(1).max(160),
  sourceMediaType: z.string().min(1).max(120).default("audio/mpeg"),
  sourceAudioDataBase64: z.string().min(1),
  requestedStems: z.array(stemTypeSchema).min(1).max(8).default([
    "vocals",
    "instrumental",
  ]),
  notes: z.string().max(1000).optional().default(""),
});

export const stemJobCallbackSchema = z.object({
  status: z.enum(["running", "succeeded", "failed"]),
  providerJobId: z.string().max(240).optional(),
  error: z.string().max(1000).optional(),
  metadata: z.unknown().optional(),
  stems: z
    .array(
      z.object({
        stemType: stemTypeSchema,
        title: z.string().max(160).optional(),
        audioUrl: z.string().url().optional(),
        audioDataBase64: z.string().optional(),
        mediaType: z.string().min(1).max(120).optional().default("audio/mpeg"),
        metadata: z.unknown().optional(),
      }),
    )
    .max(12)
    .optional()
    .default([]),
});

export const stemVariationJobRequestSchema = z.object({
  sourceAudioDataBase64: z.string().min(1),
  sourceJobId: z.string().max(160).optional().default(""),
  sourceMediaType: z.string().min(1).max(120).default("audio/mpeg"),
  sourceSongTitle: z.string().max(160).optional().default(""),
  sourceStemId: z.string().min(1).max(160),
  sourceStemTitle: z.string().min(1).max(160),
  sourceStyle: z.string().max(1000).optional().default(""),
  stemType: stemTypeSchema.default("other"),
  directionPrompt: z.string().min(2).max(2000),
  durationMs: z.number().int().min(0).max(60 * 60 * 1000).optional().default(0),
  notes: z.string().max(1000).optional().default(""),
});

export const stemVariationJobCallbackSchema = z.object({
  status: z.enum(["running", "succeeded", "failed"]),
  providerJobId: z.string().max(240).optional(),
  audioUrl: z.string().url().optional(),
  audioDataBase64: z.string().optional(),
  mediaType: z.string().min(1).max(120).optional().default("audio/mpeg"),
  title: z.string().max(160).optional(),
  error: z.string().max(1000).optional(),
  metadata: z.unknown().optional(),
});

export const remasterTargetSchema = z.enum([
  "balanced-master",
  "vocal-clarity",
  "streaming-loudness",
  "warm-analog",
]);

export const remasterJobRequestSchema = z.object({
  sourceSongId: z.string().min(1).max(160),
  sourceTitle: z.string().min(1).max(160),
  sourceMediaType: z.string().min(1).max(120).default("audio/mpeg"),
  sourceAudioDataBase64: z.string().min(1),
  durationMs: z.number().int().min(0).max(60 * 60 * 1000).optional().default(0),
  target: remasterTargetSchema.default("balanced-master"),
  notes: z.string().max(1000).optional().default(""),
  region: z
    .object({
      startMs: z.number().int().min(0),
      endMs: z.number().int().min(0),
    })
    .optional(),
});

export const remasterJobCallbackSchema = z.object({
  status: z.enum(["running", "succeeded", "failed"]),
  providerJobId: z.string().max(240).optional(),
  audioUrl: z.string().url().optional(),
  audioDataBase64: z.string().optional(),
  mediaType: z.string().min(1).max(120).optional().default("audio/mpeg"),
  title: z.string().max(160).optional(),
  error: z.string().max(1000).optional(),
  metadata: z.unknown().optional(),
});

export const removeFxTargetSchema = z.enum([
  "reverb",
  "delay",
  "noise",
  "heavy-processing",
  "mixed-fx",
]);

export const removeFxJobRequestSchema = z.object({
  sourceSongId: z.string().min(1).max(160),
  sourceTitle: z.string().min(1).max(160),
  sourceMediaType: z.string().min(1).max(120).default("audio/mpeg"),
  sourceAudioDataBase64: z.string().min(1),
  durationMs: z.number().int().min(0).max(60 * 60 * 1000).optional().default(0),
  cleanupTargets: z
    .array(removeFxTargetSchema)
    .min(1)
    .max(5)
    .default(["mixed-fx"]),
  intensity: z.enum(["light", "balanced", "strong"]).default("balanced"),
  notes: z.string().max(1000).optional().default(""),
  region: z
    .object({
      startMs: z.number().int().min(0),
      endMs: z.number().int().min(0),
    })
    .optional(),
});

export const removeFxJobCallbackSchema = z.object({
  status: z.enum(["running", "succeeded", "failed"]),
  providerJobId: z.string().max(240).optional(),
  audioUrl: z.string().url().optional(),
  audioDataBase64: z.string().optional(),
  mediaType: z.string().min(1).max(120).optional().default("audio/mpeg"),
  title: z.string().max(160).optional(),
  error: z.string().max(1000).optional(),
  metadata: z.unknown().optional(),
});

export const coverRemixModeSchema = z.enum(["cover", "remix"]);

export const coverRemixJobRequestSchema = z.object({
  sourceSongId: z.string().min(1).max(160),
  sourceTitle: z.string().min(1).max(160),
  sourceMediaType: z.string().min(1).max(120).default("audio/mpeg"),
  sourceAudioDataBase64: z.string().min(1),
  durationMs: z.number().int().min(0).max(60 * 60 * 1000).optional().default(0),
  lyrics: z.string().max(5000).optional().default(""),
  mode: coverRemixModeSchema.default("remix"),
  notes: z.string().max(1000).optional().default(""),
  creativeControls: creativeControlsSchema,
  sourceStyle: z.string().max(1000).optional().default(""),
  targetStyle: z.string().min(2).max(1000),
});

export const coverRemixJobCallbackSchema = z.object({
  status: z.enum(["running", "succeeded", "failed"]),
  providerJobId: z.string().max(240).optional(),
  audioUrl: z.string().url().optional(),
  audioDataBase64: z.string().optional(),
  mediaType: z.string().min(1).max(120).optional().default("audio/mpeg"),
  title: z.string().max(160).optional(),
  error: z.string().max(1000).optional(),
  metadata: z.unknown().optional(),
});

export const extendSongJobRequestSchema = z.object({
  sourceSongId: z.string().min(1).max(160),
  sourceTitle: z.string().min(1).max(160),
  sourceMediaType: z.string().min(1).max(120).default("audio/mpeg"),
  sourceAudioDataBase64: z.string().min(1),
  durationMs: z.number().int().min(0).max(60 * 60 * 1000).optional().default(0),
  continuationPrompt: z.string().min(2).max(2000),
  extendFromMs: z.number().int().min(0).max(60 * 60 * 1000).optional().default(0),
  lyrics: z.string().max(5000).optional().default(""),
  maxExtensionMs: z.number().int().min(5000).max(5 * 60 * 1000).optional().default(60000),
  notes: z.string().max(1000).optional().default(""),
  creativeControls: creativeControlsSchema,
  sourceStyle: z.string().max(1000).optional().default(""),
});

export const extendSongJobCallbackSchema = z.object({
  status: z.enum(["running", "succeeded", "failed"]),
  providerJobId: z.string().max(240).optional(),
  audioUrl: z.string().url().optional(),
  audioDataBase64: z.string().optional(),
  mediaType: z.string().min(1).max(120).optional().default("audio/mpeg"),
  title: z.string().max(160).optional(),
  error: z.string().max(1000).optional(),
  metadata: z.unknown().optional(),
});

export const replaceSectionModeSchema = z.enum(["replace", "add"]);

export const replaceSectionJobRequestSchema = z.object({
  sourceSongId: z.string().min(1).max(160),
  sourceTitle: z.string().min(1).max(160),
  sourceMediaType: z.string().min(1).max(120).default("audio/mpeg"),
  sourceAudioDataBase64: z.string().min(1),
  durationMs: z.number().int().min(0).max(60 * 60 * 1000).optional().default(0),
  directionPrompt: z.string().min(2).max(2000),
  lyrics: z.string().max(5000).optional().default(""),
  mode: replaceSectionModeSchema.default("replace"),
  notes: z.string().max(1000).optional().default(""),
  creativeControls: creativeControlsSchema,
  region: z.object({
    startMs: z.number().int().min(0).max(60 * 60 * 1000),
    endMs: z.number().int().min(0).max(60 * 60 * 1000),
  }),
  sourceStyle: z.string().max(1000).optional().default(""),
});

export const replaceSectionJobCallbackSchema = z.object({
  status: z.enum(["running", "succeeded", "failed"]),
  providerJobId: z.string().max(240).optional(),
  audioUrl: z.string().url().optional(),
  audioDataBase64: z.string().optional(),
  mediaType: z.string().min(1).max(120).optional().default("audio/mpeg"),
  title: z.string().max(160).optional(),
  error: z.string().max(1000).optional(),
  metadata: z.unknown().optional(),
});

export const audioToMidiSourceKindSchema = z.enum(["track", "region", "stem"]);

export const audioToMidiJobRequestSchema = z.object({
  sourceAudioDataBase64: z.string().min(1),
  sourceKind: audioToMidiSourceKindSchema.default("track"),
  sourceMediaType: z.string().min(1).max(120).default("audio/mpeg"),
  sourceSongId: z.string().min(1).max(160),
  sourceTitle: z.string().min(1).max(160),
  durationMs: z.number().int().min(0).max(60 * 60 * 1000).optional().default(0),
  notes: z.string().max(1000).optional().default(""),
  region: z
    .object({
      startMs: z.number().int().min(0).max(60 * 60 * 1000),
      endMs: z.number().int().min(0).max(60 * 60 * 1000),
    })
    .optional(),
});

export const audioToMidiJobCallbackSchema = z.object({
  status: z.enum(["running", "succeeded", "failed"]),
  providerJobId: z.string().max(240).optional(),
  midiUrl: z.string().url().optional(),
  midiDataBase64: z.string().optional(),
  mediaType: z.string().min(1).max(120).optional().default("audio/midi"),
  title: z.string().max(160).optional(),
  error: z.string().max(1000).optional(),
  metadata: z.unknown().optional(),
});

export const warpMarkerKindSchema = z.enum([
  "beat",
  "downbeat",
  "transient",
  "bar",
  "section",
  "edit",
]);

export const warpMarkerJobRequestSchema = z.object({
  sourceAudioDataBase64: z.string().min(1),
  sourceKind: z.enum(["track", "region"]).default("track"),
  sourceMediaType: z.string().min(1).max(120).default("audio/mpeg"),
  sourceSongId: z.string().min(1).max(160),
  sourceTitle: z.string().min(1).max(160),
  analysisMode: z
    .enum(["transients", "beats", "sections", "mixed"])
    .default("mixed"),
  durationMs: z.number().int().min(0).max(60 * 60 * 1000).optional().default(0),
  notes: z.string().max(1000).optional().default(""),
  region: z
    .object({
      startMs: z.number().int().min(0).max(60 * 60 * 1000),
      endMs: z.number().int().min(0).max(60 * 60 * 1000),
    })
    .optional(),
  targetGrid: z.enum(["auto", "1/4", "1/8", "1/16"]).default("auto"),
});

export const warpMarkerSchema = z.object({
  confidence: z.number().min(0).max(1).optional(),
  kind: warpMarkerKindSchema.default("transient"),
  label: z.string().max(160).optional().default(""),
  metadata: z.unknown().optional(),
  startMs: z.number().int().min(0).max(60 * 60 * 1000),
});

export const warpMarkerJobCallbackSchema = z.object({
  status: z.enum(["running", "succeeded", "failed"]),
  providerJobId: z.string().max(240).optional(),
  bpm: z.number().int().min(20).max(400).optional(),
  error: z.string().max(1000).optional(),
  markers: z.array(warpMarkerSchema).max(2000).optional().default([]),
  metadata: z.unknown().optional(),
  timeSignature: z.string().max(16).optional(),
});

export const generatedVocalsJobRequestSchema = z.object({
  sourceAudioDataBase64: z.string().min(1),
  sourceMediaType: z.string().min(1).max(120).default("audio/mpeg"),
  sourceSongId: z.string().min(1).max(160),
  sourceTitle: z.string().min(1).max(160),
  durationMs: z.number().int().min(0).max(60 * 60 * 1000).optional().default(0),
  directionPrompt: z.string().max(2000).optional().default(""),
  lyrics: z.string().min(1).max(5000),
  notes: z.string().max(1000).optional().default(""),
  region: z
    .object({
      startMs: z.number().int().min(0).max(60 * 60 * 1000),
      endMs: z.number().int().min(0).max(60 * 60 * 1000),
    })
    .optional(),
  sourceStyle: z.string().max(1000).optional().default(""),
  voiceProfile: z.object({
    id: z.string().min(1).max(160),
    name: z.string().min(1).max(120),
    rightsConfirmed: z.boolean(),
    sampleSummary: z.string().max(500),
    summary: z.string().max(500),
  }),
});

export const generatedVocalsJobCallbackSchema = z.object({
  status: z.enum(["running", "succeeded", "failed"]),
  providerJobId: z.string().max(240).optional(),
  audioUrl: z.string().url().optional(),
  audioDataBase64: z.string().optional(),
  mediaType: z.string().min(1).max(120).optional().default("audio/mpeg"),
  title: z.string().max(160).optional(),
  error: z.string().max(1000).optional(),
  metadata: z.unknown().optional(),
});

export const generatedInstrumentalJobRequestSchema = z.object({
  sourceAudioDataBase64: z.string().min(1),
  sourceKind: z.enum(["track", "region", "vocal"]).default("track"),
  sourceMediaType: z.string().min(1).max(120).default("audio/mpeg"),
  sourceSongId: z.string().min(1).max(160),
  sourceTitle: z.string().min(1).max(160),
  durationMs: z.number().int().min(0).max(60 * 60 * 1000).optional().default(0),
  directionPrompt: z.string().min(2).max(2000),
  lyrics: z.string().max(5000).optional().default(""),
  notes: z.string().max(1000).optional().default(""),
  region: z
    .object({
      startMs: z.number().int().min(0).max(60 * 60 * 1000),
      endMs: z.number().int().min(0).max(60 * 60 * 1000),
    })
    .optional(),
  sourceStyle: z.string().max(1000).optional().default(""),
});

export const generatedInstrumentalJobCallbackSchema = z.object({
  status: z.enum(["running", "succeeded", "failed"]),
  providerJobId: z.string().max(240).optional(),
  audioUrl: z.string().url().optional(),
  audioDataBase64: z.string().optional(),
  mediaType: z.string().min(1).max(120).optional().default("audio/mpeg"),
  title: z.string().max(160).optional(),
  error: z.string().max(1000).optional(),
  metadata: z.unknown().optional(),
});

export const personaGenerationJobRequestSchema = z.object({
  sourceAudioDataBase64: z.string().min(1),
  sourceMediaType: z.string().min(1).max(120).default("audio/mpeg"),
  sourceSongId: z.string().min(1).max(160),
  sourceTitle: z.string().min(1).max(160),
  durationMs: z.number().int().min(0).max(60 * 60 * 1000).optional().default(0),
  analysisPrompt: z.string().min(2).max(2000),
  lyrics: z.string().max(5000).optional().default(""),
  notes: z.string().max(1000).optional().default(""),
  rightsConfirmed: z.boolean(),
  sourceStyle: z.string().max(1000).optional().default(""),
});

export const generatedPersonaSchema = z.object({
  energy: z.string().min(1).max(160),
  name: z.string().min(1).max(120),
  stylePrompt: z.string().min(1).max(1000),
  vibe: z.string().min(1).max(500),
  vocalCharacter: z.string().min(1).max(500),
});

export const personaGenerationJobCallbackSchema = z.object({
  status: z.enum(["running", "succeeded", "failed"]),
  providerJobId: z.string().max(240).optional(),
  persona: generatedPersonaSchema.optional(),
  error: z.string().max(1000).optional(),
  metadata: z.unknown().optional(),
});

export const modelTrainingSourceSchema = z.object({
  sourceAudioDataBase64: z.string().min(1),
  sourceMediaType: z.string().min(1).max(120).default("audio/mpeg"),
  sourceSongId: z.string().min(1).max(160),
  sourceTitle: z.string().min(1).max(160),
  durationMs: z.number().int().min(0).max(60 * 60 * 1000).optional().default(0),
  lyrics: z.string().max(5000).optional().default(""),
  sourceStyle: z.string().max(1000).optional().default(""),
  tags: z.array(z.string().max(80)).max(24).optional().default([]),
});

export const modelTrainingJobRequestSchema = z.object({
  modelIntent: z.string().min(2).max(2000),
  modelName: z.string().min(1).max(120),
  constraints: z.string().max(2000).optional().default(""),
  notes: z.string().max(1000).optional().default(""),
  rightsConfirmed: z.boolean(),
  sources: z.array(modelTrainingSourceSchema).min(1).max(20),
});

export const customModelCardSchema = z.object({
  constraints: z.string().max(2000).optional().default(""),
  description: z.string().max(1000).optional().default(""),
  modelIntent: z.string().min(1).max(2000),
  name: z.string().min(1).max(120),
  providerModelId: z.string().max(240).optional().default(""),
  recommendedUse: z.string().max(1000).optional().default(""),
  styleSummary: z.string().max(1000).optional().default(""),
});

export const modelTrainingJobCallbackSchema = z.object({
  status: z.enum(["running", "succeeded", "failed"]),
  providerJobId: z.string().max(240).optional(),
  modelCard: customModelCardSchema.optional(),
  error: z.string().max(1000).optional(),
  metadata: z.unknown().optional(),
});

export const songBriefSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  tags: z.array(z.string()).min(3).max(12),
  bpmRange: z.string(),
  keySuggestion: z.string(),
  arrangement: z.array(
    z.object({
      section: z.string(),
      purpose: z.string(),
      energy: z.enum(["low", "medium", "high"]),
    }),
  ),
  productionNotes: z.array(z.string()).min(3).max(8),
  releaseChecklist: z.array(z.string()).min(3).max(8),
});

export const metadataSuggestionSchema = z.object({
  titles: z.array(z.string()).min(3).max(8),
  tags: z.array(z.string()).min(5).max(14),
  description: z.string(),
  mood: z.string(),
  bpmGuess: z.string(),
  releaseCopy: z.string(),
});

export const playlistInspirationSchema = z.object({
  playlists: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        trackIdeas: z.array(z.string()).min(3).max(8),
      }),
    )
    .min(3)
    .max(6),
});

export type AiProviderStatus = z.infer<typeof aiProviderStatusSchema>;
export type CoverRemixMode = z.infer<typeof coverRemixModeSchema>;
export type CreativeControls = z.infer<typeof creativeControlsSchema>;
export type MetadataSuggestion = z.infer<typeof metadataSuggestionSchema>;
export type PlaylistInspiration = z.infer<typeof playlistInspirationSchema>;
export type ProviderCapability = z.infer<typeof providerCapabilitySchema>;
export type ProviderCapabilitySummary = z.infer<
  typeof providerCapabilitySummarySchema
>;
export type ReplaceSectionMode = z.infer<typeof replaceSectionModeSchema>;
export type RemoveFxTarget = z.infer<typeof removeFxTargetSchema>;
export type RemasterTarget = z.infer<typeof remasterTargetSchema>;
export type SongBrief = z.infer<typeof songBriefSchema>;
export type StemType = z.infer<typeof stemTypeSchema>;
export type WarpMarkerJobMarker = z.infer<typeof warpMarkerSchema>;
