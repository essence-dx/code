import { z } from "zod";
import { isValidBase64ImagePayload } from "@/lib/media/base64-image";

const aiSecondsSchema = z.number().finite().min(0).max(7200);
const captionChunkOutputSchema = z
  .object({
    start: aiSecondsSchema,
    end: aiSecondsSchema,
    text: z.string().min(1).max(2000),
    emphasis: z.enum(["normal", "strong", "quiet"]),
  })
  .refine((caption) => caption.end > caption.start, "Caption end time must be after the start time.");

export const aiActionSchema = z.enum([
  "script",
  "captions",
  "b-roll",
  "video-project",
  "repurpose",
  "edit-plan",
  "transcript-cleanup",
  "smart-cut",
  "subtitle-style",
  "subtitle-translation",
  "image",
  "image-edit",
]);

export const aiImageEditModeSchema = z.enum(["inpaint", "outpaint", "background-removal", "cleanup", "translate"]);
export const aiImageOutpaintPresetSchema = z.enum(["project", "square", "vertical", "wide"]);

const sourceImageSchema = z.object({
  filename: z.string().min(1).max(160),
  mediaType: z.string().regex(/^image\/[a-z0-9.+-]+$/i),
  base64: z.string().refine(isValidBase64ImagePayload, "Source image data is invalid."),
});

const sourceMaskSchema = z.object({
  filename: z.string().min(1).max(160),
  mediaType: z.literal("image/png"),
  base64: z.string().refine(isValidBase64ImagePayload, "Source mask data is invalid."),
});

const imageEditOptionsSchema = z.object({
  mode: aiImageEditModeSchema,
  outpaintPreset: aiImageOutpaintPresetSchema.optional(),
  targetLanguage: z.string().min(2).max(80).optional(),
  mask: sourceMaskSchema.optional(),
});

export const aiEditorRequestSchema = z
  .object({
    action: aiActionSchema,
    prompt: z.string().min(1).max(4000),
    projectTitle: z.string().max(120).optional(),
    aspectRatio: z.string().max(16).optional(),
    duration: aiSecondsSchema.optional(),
    transcript: z.string().max(12000).optional(),
    mediaBrief: z.string().max(6000).optional(),
    brandColors: z.array(z.string().regex(/^#[0-9a-f]{6}$/i)).max(12).optional(),
    projectId: z.string().max(160).optional(),
    sourceImage: sourceImageSchema.optional(),
    imageEdit: imageEditOptionsSchema.optional(),
  })
  .superRefine((input, context) => {
    if (input.action === "image-edit" && !input.sourceImage) {
      context.addIssue({
        code: "custom",
        path: ["sourceImage"],
        message: "Choose an image layer before requesting an AI image edit.",
      });
    }
    if (input.action === "image-edit" && input.imageEdit?.mode === "inpaint" && !input.imageEdit.mask) {
      context.addIssue({
        code: "custom",
        path: ["imageEdit", "mask"],
        message: "Add an object mask before requesting an inpaint edit.",
      });
    }
  });

export const scriptOutputSchema = z.object({
  title: z.string(),
  hook: z.string(),
  scenes: z.array(
    z.object({
      label: z.string(),
      seconds: aiSecondsSchema,
      narration: z.string(),
      visualDirection: z.string(),
      onScreenText: z.string(),
    }),
  ),
  callToAction: z.string(),
});

export const captionsOutputSchema = z.object({
  captions: z.array(captionChunkOutputSchema),
});

export const repurposeOutputSchema = z.object({
  clips: z.array(
    z.object({
      title: z.string(),
      start: aiSecondsSchema,
      end: aiSecondsSchema,
      platform: z.enum(["youtube-shorts", "instagram-reels", "tiktok", "linkedin", "x"]),
      caption: z.string(),
      editNotes: z.array(z.string()),
    }).refine((clip) => clip.end > clip.start, "Clip end time must be after the start time."),
  ),
});

export const brollOutputSchema = z.object({
  suggestions: z
    .array(
      z
        .object({
          query: z.string().min(2).max(120),
          mediaType: z.enum(["image", "video"]),
          start: aiSecondsSchema,
          end: aiSecondsSchema,
          layerName: z.string().min(1).max(120),
          placement: z.enum(["background", "overlay", "cutaway"]),
          rationale: z.string().min(1).max(500),
          searchNotes: z.array(z.string().min(1).max(240)).max(4),
        })
        .refine((suggestion) => suggestion.end > suggestion.start, "B-roll end time must be after the start time."),
    )
    .max(6),
});

export const videoProjectOutputSchema = z.object({
  title: z.string().min(1).max(120),
  aspectRatio: z.enum(["16:9", "9:16", "1:1", "4:5"]),
  summary: z.string().min(1).max(800),
  exportPreset: z.enum(["mp4-1080p", "webm-1080p", "gif-social", "project-bundle"]),
  scenes: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        duration: z.number().finite().min(1).max(45),
        headline: z.string().min(1).max(140),
        caption: z.string().min(1).max(240),
        visualPrompt: z.string().min(1).max(500),
        brollQuery: z.string().min(2).max(120).optional(),
        backgroundColor: z.string().regex(/^#[0-9a-f]{6}$/i),
        accentColor: z.string().regex(/^#[0-9a-f]{6}$/i),
      }),
    )
    .min(1)
    .max(12),
  notes: z.array(z.string().min(1).max(300)).max(10),
});

export const editPlanOutputSchema = z.object({
  objective: z.string(),
  steps: z.array(
    z.object({
      tool: z.enum(["trim", "split", "caption", "text", "audio", "resize", "overlay", "export"]),
      instruction: z.string(),
      targetTime: aiSecondsSchema.nullable(),
    }),
  ),
  exportPreset: z.enum(["mp4-1080p", "webm-1080p", "gif-social", "project-bundle"]),
});

export const transcriptCleanupOutputSchema = z.object({
  cleanedTranscript: z.string(),
  summary: z.string(),
  fixes: z.array(z.string()),
  captionChunks: z.array(captionChunkOutputSchema),
});

export const smartCutOutputSchema = z.object({
  objective: z.string(),
  cuts: z.array(
    z.object({
      start: aiSecondsSchema,
      end: aiSecondsSchema,
      priority: z.enum(["high", "medium", "low"]),
      suggestedAction: z.enum(["keep", "trim", "split", "remove", "caption"]),
      reason: z.string(),
    }).refine((cut) => cut.end > cut.start, "Cut end time must be after the start time."),
  ),
});

export const subtitleStyleOutputSchema = z.object({
  style: z.object({
    fill: z.string().regex(/^#[0-9a-f]{6}$/i),
    background: z.string().regex(/^#[0-9a-f]{6}$/i),
    fontSize: z.number().finite().min(16).max(96),
    fontWeight: z.number().finite().min(300).max(900),
  }),
  rationale: z.string(),
  sampleCaptions: z.array(z.string()),
});

export const subtitleTranslationOutputSchema = z.object({
  sourceLanguage: z.string().min(2).max(80),
  targetLanguage: z.string().min(2).max(80),
  translatedCaptions: z.array(captionChunkOutputSchema),
  notes: z.array(z.string().min(1).max(300)).max(12),
});

export const imageOutputSchema = z.object({
  images: z.array(
    z.object({
      filename: z.string().min(1).max(160),
      mediaType: z.string().regex(/^image\/[a-z0-9.+-]+$/i),
      base64: z.string().refine(isValidBase64ImagePayload, "Generated image data is invalid."),
      prompt: z.string().min(1).max(2000),
      model: z.string().min(1).max(120),
      editMode: aiImageEditModeSchema.optional(),
      sourceImageName: z.string().min(1).max(160).optional(),
    }),
  ),
  note: z.string().optional(),
});

export type AiEditorRequest = z.infer<typeof aiEditorRequestSchema>;
export type AiAction = z.infer<typeof aiActionSchema>;
export type AiImageEditMode = z.infer<typeof aiImageEditModeSchema>;
export type AiImageOutpaintPreset = z.infer<typeof aiImageOutpaintPresetSchema>;
export type AiUsageAction = AiAction | "voiceover" | "audio-cleanup" | "video-enhancement" | "scene-video";
