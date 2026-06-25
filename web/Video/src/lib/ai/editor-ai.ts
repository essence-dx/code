import { groq, type GroqLanguageModelOptions } from "@ai-sdk/groq";
import type { LanguageModelV3, SharedV3ProviderOptions } from "@ai-sdk/provider";
import { generateImage, generateText, gateway, Output } from "ai";
import {
  aiGenerationAssetMetadata,
  logAiGenerationRecord,
  promptForGenerationRecord,
  summarizeAiGenerationOutput,
} from "@/lib/ai/generation-records";
import { assertAiSafety, reviewEditorAiSafety } from "@/lib/ai/safety";
import {
  aiEditorRequestSchema,
  brollOutputSchema,
  captionsOutputSchema,
  editPlanOutputSchema,
  imageOutputSchema,
  repurposeOutputSchema,
  scriptOutputSchema,
  smartCutOutputSchema,
  subtitleStyleOutputSchema,
  subtitleTranslationOutputSchema,
  transcriptCleanupOutputSchema,
  videoProjectOutputSchema,
  type AiEditorRequest,
} from "@/lib/ai/schemas";
import { assertAiUsageAllowed, logAiUsage } from "@/lib/ai/usage";
import { normalizeBase64ImageData } from "@/lib/media/base64-image";

const actionPrompts = {
  script:
    "Create a concise creator-ready video script. Keep scenes practical for a browser video editor with text, clips, captions, overlays, and audio.",
  captions:
    "Draft timed captions from the prompt or transcript. Return clean, short caption chunks with readable timing.",
  "b-roll":
    "Suggest practical B-roll cutaways that can be fulfilled with free stock search. Use generic, safe search terms and avoid trademarks, copyrighted characters, or private people.",
  "video-project":
    "Turn a script, article, PDF text, screenshot, storyboard image, or brief into a complete editable video project blueprint with scenes, captions, visual direction, and stock-search-friendly B-roll queries.",
  repurpose:
    "Find strong social clips and explain the edit notes needed to repurpose the source into short-form videos.",
  "edit-plan":
    "Create a concrete editing plan using only real editor tools: trim, split, caption, text, audio, resize, overlay, and export.",
  "transcript-cleanup":
    "Clean the transcript for captions. Remove filler, repair punctuation, keep the speaker's intent, and return timed caption chunks.",
  "smart-cut":
    "Suggest practical cuts from a transcript or editor brief. Prefer concise social pacing, but do not invent source timestamps beyond the provided duration.",
  "subtitle-style":
    "Choose readable subtitle styling for the project. Use brand colors when supplied and keep contrast strong for video overlays.",
  "subtitle-translation":
    "Translate the provided captions or transcript into the requested target language while preserving timing, short readable phrasing, and speaker intent.",
  image:
    "Generate an editor-ready visual asset for this project. Make it useful as a video overlay, thumbnail element, background, sticker, or scene visual.",
  "image-edit":
    "Edit the provided source image into a polished editor-ready asset while preserving the user's intent and making the result useful on a video canvas.",
} as const;

const outputByAction = {
  script: Output.object({ schema: scriptOutputSchema }),
  captions: Output.object({ schema: captionsOutputSchema }),
  repurpose: Output.object({ schema: repurposeOutputSchema }),
  "edit-plan": Output.object({ schema: editPlanOutputSchema }),
  "transcript-cleanup": Output.object({ schema: transcriptCleanupOutputSchema }),
  "smart-cut": Output.object({ schema: smartCutOutputSchema }),
  "subtitle-style": Output.object({ schema: subtitleStyleOutputSchema }),
  "subtitle-translation": Output.object({ schema: subtitleTranslationOutputSchema }),
  "b-roll": Output.object({ schema: brollOutputSchema }),
  "video-project": Output.object({ schema: videoProjectOutputSchema }),
} as const;

export function hasGroqConfig() {
  return Boolean(process.env.GROQ_API_KEY);
}

export function hasAiGatewayConfig() {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL);
}

export function hasAiProviderConfig() {
  return hasGroqConfig() || hasAiGatewayConfig();
}

export async function runEditorAi(rawInput: unknown, context: { userId: string }) {
  const input = aiEditorRequestSchema.parse(rawInput);
  const safetyReview = reviewEditorAiSafety(input);

  if (safetyReview.status === "blocked") {
    await logAiGenerationRecord({
      userId: context.userId,
      projectId: input.projectId,
      action: input.action,
      provider: "safety",
      model: "preflight",
      status: "failed",
      safetyStatus: safetyReview.status,
      safetyReason: safetyReview.reason,
      promptText: input.prompt,
      promptChars: estimateInputChars(input),
      error: safetyReview.reason,
    });
  }
  assertAiSafety(safetyReview);

  if (isImageAiAction(input.action) && !hasAiGatewayConfig()) {
    return {
      ok: false as const,
      reason: "Image generation and editing are not configured for this workspace yet. Text editing actions may still be available.",
    };
  }

  if (isVideoProjectImageSource(input) && !hasAiGatewayConfig()) {
    return {
      ok: false as const,
      reason: "Image-source video projects need a configured AI Gateway vision model. Text and PDF source imports may still be available.",
    };
  }

  if (!isImageAiAction(input.action) && !hasAiProviderConfig()) {
    return {
      ok: false as const,
      reason: "Creative AI is not configured for this workspace yet.",
    };
  }

  if (isImageAiAction(input.action)) {
    const modelConfig = resolveImageModel();
    await assertAiUsageAllowed(context.userId, input.action, modelConfig.modelId);

    try {
      const output = await generateImageOutput(input, modelConfig.modelId);
      const usageEventId = await logAiUsage({
        userId: context.userId,
        projectId: input.projectId,
        action: input.action,
        model: modelConfig.modelId,
        status: "complete",
        promptChars: estimateInputChars(input),
        outputChars: JSON.stringify(output).length,
      });
      await recordEditorGeneration({ context, input, provider: modelConfig.provider, model: modelConfig.modelId, status: "complete", usageEventId, output, safetyReview });

      return {
        ok: true as const,
        action: input.action,
        provider: modelConfig.provider,
        model: modelConfig.modelId,
        output,
      };
    } catch (error) {
      const usageEventId = await logAiUsage({
        userId: context.userId,
        projectId: input.projectId,
        action: input.action,
        model: modelConfig.modelId,
        status: "failed",
        promptChars: estimateInputChars(input),
        error: error instanceof Error ? error.message : "AI request failed.",
      });
      await recordEditorGeneration({
        context,
        input,
        provider: modelConfig.provider,
        model: modelConfig.modelId,
        status: "failed",
        usageEventId,
        error,
        safetyReview,
      });
      throw error;
    }
  }

  const modelConfig = isVideoProjectImageSource(input)
    ? resolveVisionTextModel(input.action, context.userId)
    : resolveTextModel(input.action, context.userId);
  await assertAiUsageAllowed(context.userId, input.action, modelConfig.modelId);

  try {
    const output = await generateStructuredOutput(input, modelConfig);
    const usageEventId = await logAiUsage({
      userId: context.userId,
      projectId: input.projectId,
      action: input.action,
      model: modelConfig.modelId,
      status: "complete",
      promptChars: estimateInputChars(input),
      outputChars: JSON.stringify(output).length,
    });
    await recordEditorGeneration({ context, input, provider: modelConfig.provider, model: modelConfig.modelId, status: "complete", usageEventId, output, safetyReview });

    return {
      ok: true as const,
      action: input.action,
      provider: modelConfig.provider,
      model: modelConfig.modelId,
      output,
    };
  } catch (error) {
    const usageEventId = await logAiUsage({
      userId: context.userId,
      projectId: input.projectId,
      action: input.action,
      model: modelConfig.modelId,
      status: "failed",
      promptChars: estimateInputChars(input),
      error: error instanceof Error ? error.message : "AI request failed.",
    });
    await recordEditorGeneration({
      context,
      input,
      provider: modelConfig.provider,
      model: modelConfig.modelId,
      status: "failed",
      usageEventId,
      error,
      safetyReview,
    });
    throw error;
  }
}

type TextModelConfig = {
  provider: "groq" | "gateway";
  modelId: string;
  model: LanguageModelV3 | string;
  providerOptions: SharedV3ProviderOptions;
};

async function recordEditorGeneration({
  context,
  input,
  provider,
  model,
  status,
  usageEventId,
  output,
  error,
  safetyReview,
}: {
  context: { userId: string };
  input: AiEditorRequest;
  provider: string;
  model: string;
  status: "complete" | "failed";
  usageEventId?: string;
  output?: unknown;
  error?: unknown;
  safetyReview: ReturnType<typeof reviewEditorAiSafety>;
}) {
  const outputJson = output ? JSON.stringify(output) : "";
  const asset = output ? aiGenerationAssetMetadata(input.action, output) : { kind: "none" as const };
  await logAiGenerationRecord({
    userId: context.userId,
    projectId: input.projectId,
    usageEventId,
    action: input.action,
    provider,
    model,
    status,
    safetyStatus: safetyReview.status,
    safetyReason: safetyReview.reason,
    promptText: promptForGenerationRecord(input.prompt),
    promptChars: estimateInputChars(input),
    outputChars: outputJson.length,
    outputSummary: output ? summarizeAiGenerationOutput(input.action, output) : undefined,
    outputAssetKind: asset.kind,
    outputAssetName: asset.name,
    error: error instanceof Error ? error.message : undefined,
  });
}

async function generateStructuredOutput(input: AiEditorRequest, modelConfig: TextModelConfig) {
  if (isImageAiAction(input.action)) {
    throw new Error("Image generation uses the image model path.");
  }

  const context = [
    `Project: ${input.projectTitle ?? "Untitled"}`,
    `Aspect ratio: ${input.aspectRatio ?? "not set"}`,
    `Duration: ${input.duration ?? 0}s`,
    input.brandColors?.length ? `Brand colors: ${input.brandColors.join(", ")}` : null,
    input.transcript ? `Transcript:\n${input.transcript}` : null,
    input.mediaBrief ? `Available media:\n${input.mediaBrief}` : null,
    isVideoProjectImageSource(input) ? `Source image: ${input.sourceImage.filename} (${input.sourceImage.mediaType})` : null,
    `Request:\n${input.prompt}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const promptText = `${actionPrompts[input.action]}\n\n${context}`;
  const promptInput = isVideoProjectImageSource(input)
    ? {
        messages: [
          {
            role: "user" as const,
            content: [
              { type: "text" as const, text: promptText },
              {
                type: "image" as const,
                image: normalizeBase64ImageData(input.sourceImage.base64),
                mediaType: input.sourceImage.mediaType,
              },
            ],
          },
        ],
      }
    : { prompt: promptText };

  const { output } = await generateText({
    model: modelConfig.model,
    output: outputByAction[input.action],
    system:
      "You are an expert short-form video editor inside Essence Studio. Return only useful, feasible editing output for the requested action. Do not mention paid services.",
    providerOptions: modelConfig.providerOptions,
    ...promptInput,
  });

  return output;
}

async function generateImageOutput(input: AiEditorRequest, model: string) {
  const promptText = [
    actionPrompts[input.action],
    `Project: ${input.projectTitle ?? "Untitled"}`,
    `Aspect ratio: ${input.aspectRatio ?? "not set"}`,
    input.action === "image-edit" ? imageEditInstruction(input) : null,
    input.brandColors?.length ? `Brand colors: ${input.brandColors.join(", ")}` : null,
    input.transcript ? `Source transcript:\n${input.transcript.slice(0, 4000)}` : null,
    input.sourceImage ? `Source image: ${input.sourceImage.filename} (${input.sourceImage.mediaType})` : null,
    `Request:\n${input.prompt}`,
    input.action === "image-edit"
      ? "Keep the edited image coherent with the provided source. Do not add watermarks, fake logos, copyrighted characters, UI chrome, or tiny unreadable text."
      : "Avoid watermarks, logos, copyrighted characters, UI chrome, and tiny unreadable text.",
  ]
    .filter(Boolean)
    .join("\n\n");
  const prompt =
    input.action === "image-edit" && input.sourceImage
      ? {
          images: [normalizeBase64ImageData(input.sourceImage.base64)],
          mask: input.imageEdit?.mask ? normalizeBase64ImageData(input.imageEdit.mask.base64) : undefined,
          text: promptText,
        }
      : promptText;

  const result = await generateImage({
    model: gateway.image(model),
    prompt,
    aspectRatio: imageAspectRatio(input),
    n: 1,
    providerOptions: {
      gateway: {
        tags: ["feature:editor-ai", `action:${input.action}`],
      },
    },
  });

  const filenamePrefix = input.action === "image-edit" ? "ai-image-edit" : "ai-image";
  const output = {
    images: result.images.map((image, index) => ({
      filename: `${filenamePrefix}-${Date.now()}-${index + 1}.${extensionFromMediaType(image.mediaType)}`,
      mediaType: image.mediaType,
      base64: image.base64,
      prompt: input.prompt,
      model,
      editMode: input.action === "image-edit" ? input.imageEdit?.mode ?? "cleanup" : undefined,
      sourceImageName: input.sourceImage?.filename,
    })),
    note: result.warnings.length ? `Generated with warnings: ${result.warnings.map(formatWarning).join("; ")}` : undefined,
  };

  return imageOutputSchema.parse(output);
}

function estimateInputChars(input: AiEditorRequest) {
  return [
    input.projectTitle,
    input.aspectRatio,
    input.duration?.toString(),
    input.transcript,
    input.prompt,
    input.brandColors?.join(","),
    input.sourceImage ? `${input.sourceImage.filename}:${input.sourceImage.mediaType}` : null,
    input.imageEdit ? `${input.imageEdit.mode}:${input.imageEdit.outpaintPreset ?? ""}:${input.imageEdit.targetLanguage ?? ""}` : null,
  ]
    .filter(Boolean)
    .join("\n").length;
}

function isImageAiAction(action: AiEditorRequest["action"]): action is "image" | "image-edit" {
  return action === "image" || action === "image-edit";
}

function isVideoProjectImageSource(input: AiEditorRequest): input is AiEditorRequest & {
  action: "video-project";
  sourceImage: NonNullable<AiEditorRequest["sourceImage"]>;
} {
  return input.action === "video-project" && Boolean(input.sourceImage);
}

function readImageModel() {
  return process.env.AI_IMAGE_MODEL ?? "openai/gpt-image-1-mini";
}

function resolveTextModel(action: Exclude<AiEditorRequest["action"], "image">, userId: string): TextModelConfig {
  if (hasGroqConfig()) {
    const groqModel = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";
    return {
      provider: "groq" as const,
      modelId: `groq/${groqModel}`,
      model: groq(groqModel),
      providerOptions: {
        groq: {
          structuredOutputs: true,
          user: userId,
        } satisfies GroqLanguageModelOptions,
      } satisfies SharedV3ProviderOptions,
    };
  }

  const gatewayModel = process.env.AI_GATEWAY_MODEL ?? "openai/gpt-5.4";
  return {
    provider: "gateway" as const,
    modelId: gatewayModel,
    model: gatewayModel,
    providerOptions: {
      gateway: {
        tags: ["feature:editor-ai", `action:${action}`],
        user: userId,
      },
    } satisfies SharedV3ProviderOptions,
  };
}

function resolveVisionTextModel(action: "video-project", userId: string): TextModelConfig {
  const gatewayModel = process.env.AI_GATEWAY_VISION_MODEL ?? process.env.AI_GATEWAY_MODEL ?? "openai/gpt-5.4";
  return {
    provider: "gateway" as const,
    modelId: gatewayModel,
    model: gatewayModel,
    providerOptions: {
      gateway: {
        tags: ["feature:editor-ai", "input:image-source", `action:${action}`],
        user: userId,
      },
    } satisfies SharedV3ProviderOptions,
  };
}

function resolveImageModel() {
  const modelId = readImageModel();
  return {
    provider: "gateway" as const,
    modelId,
  };
}

function toImageAspectRatio(value?: string): `${number}:${number}` | undefined {
  return value && /^\d+:\d+$/.test(value) ? (value as `${number}:${number}`) : undefined;
}

function imageAspectRatio(input: AiEditorRequest): `${number}:${number}` | undefined {
  if (input.action === "image-edit" && input.imageEdit?.mode === "outpaint") {
    if (input.imageEdit.outpaintPreset === "square") return "1:1";
    if (input.imageEdit.outpaintPreset === "vertical") return "9:16";
    if (input.imageEdit.outpaintPreset === "wide") return "16:9";
  }

  return toImageAspectRatio(input.aspectRatio);
}

function imageEditInstruction(input: AiEditorRequest) {
  const mode = input.imageEdit?.mode ?? "cleanup";
  if (mode === "inpaint") {
    return "Edit only the white area of the provided mask. Fill the masked region naturally from surrounding pixels and keep unmasked source-image content unchanged.";
  }
  if (mode === "outpaint") {
    return `Extend the source image beyond its current edges for the ${input.imageEdit?.outpaintPreset ?? "project"} canvas. Preserve the original subject, lighting, and perspective.`;
  }
  if (mode === "background-removal") {
    return "Remove the background around the main subject and return a clean editor-ready image, preferably with transparent or plain neutral background if the model supports alpha.";
  }
  if (mode === "translate") {
    return `Translate visible text in the image to ${input.imageEdit?.targetLanguage ?? "English"} while preserving layout, visual hierarchy, and readability.`;
  }

  return "Perform only lawful cleanup: remove dust, small artifacts, blemishes, or accidental clutter. Do not remove watermarks, signatures, ownership marks, safety labels, or legal notices.";
}

function extensionFromMediaType(mediaType: string) {
  if (mediaType === "image/jpeg") return "jpg";
  if (mediaType === "image/webp") return "webp";
  if (mediaType === "image/gif") return "gif";
  return "png";
}

function formatWarning(warning: { type: string; feature?: string; details?: string; message?: string }) {
  return warning.message ?? [warning.type, warning.feature, warning.details].filter(Boolean).join(": ");
}
