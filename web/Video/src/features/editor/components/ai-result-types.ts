import type { AiAction } from "@/lib/ai/schemas";
import type { AiImageEditMode } from "@/lib/ai/schemas";
import { isValidBase64ImagePayload } from "@/lib/media/base64-image";

export interface AiResult {
  action: AiAction;
  output: unknown;
}

export interface CaptionChunk {
  start: number;
  end: number;
  text: string;
  emphasis?: "normal" | "strong" | "quiet";
}

export interface SubtitleStyleOutput {
  style: {
    fill: string;
    background: string;
    fontSize: number;
    fontWeight: number;
  };
  rationale: string;
  sampleCaptions: string[];
}

export interface SubtitleTranslationOutput {
  sourceLanguage: string;
  targetLanguage: string;
  translatedCaptions: CaptionChunk[];
  notes: string[];
}

export interface GeneratedImageOutput {
  images: Array<{
    filename: string;
    mediaType: string;
    base64: string;
    prompt: string;
    model: string;
    editMode?: AiImageEditMode;
    sourceImageName?: string;
  }>;
  note?: string;
}

export interface BrollSuggestion {
  query: string;
  mediaType: "image" | "video";
  start: number;
  end: number;
  layerName: string;
  placement: "background" | "overlay" | "cutaway";
  rationale: string;
  searchNotes: string[];
}

export interface BrollOutput {
  suggestions: BrollSuggestion[];
}

export interface VideoProjectScene {
  title: string;
  duration: number;
  headline: string;
  caption: string;
  visualPrompt: string;
  brollQuery?: string;
  backgroundColor: string;
  accentColor: string;
}

export interface VideoProjectOutput {
  title: string;
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:5";
  summary: string;
  exportPreset: "mp4-1080p" | "webm-1080p" | "gif-social" | "project-bundle";
  scenes: VideoProjectScene[];
  notes: string[];
}

export interface SmartCutSuggestion {
  start: number;
  end: number;
  priority: "high" | "medium" | "low";
  suggestedAction: "keep" | "trim" | "split" | "remove" | "caption";
  reason: string;
}

export interface SmartCutOutput {
  objective: string;
  cuts: SmartCutSuggestion[];
}

export interface RepurposeClipSuggestion {
  title: string;
  start: number;
  end: number;
  platform: "youtube-shorts" | "instagram-reels" | "tiktok" | "linkedin" | "x";
  caption: string;
  editNotes: string[];
}

export interface RepurposeOutput {
  clips: RepurposeClipSuggestion[];
}

export function isCaptionOutput(value: unknown): value is { captions: CaptionChunk[] } {
  return isRecord(value) && isCaptionArray(value.captions);
}

export function isSubtitleStyleOutput(value: unknown): value is SubtitleStyleOutput {
  if (!isRecord(value) || !isRecord(value.style)) return false;

  return (
    isHexColor(value.style.fill) &&
    isHexColor(value.style.background) &&
    isBoundedNumber(value.style.fontSize, 16, 96) &&
    isBoundedNumber(value.style.fontWeight, 300, 900) &&
    Array.isArray(value.sampleCaptions) &&
    value.sampleCaptions.every((item) => typeof item === "string") &&
    typeof value.rationale === "string"
  );
}

export function isSubtitleTranslationOutput(value: unknown): value is SubtitleTranslationOutput {
  return (
    isRecord(value) &&
    typeof value.sourceLanguage === "string" &&
    value.sourceLanguage.trim().length >= 2 &&
    typeof value.targetLanguage === "string" &&
    value.targetLanguage.trim().length >= 2 &&
    isCaptionArray(value.translatedCaptions) &&
    Array.isArray(value.notes) &&
    value.notes.every((item) => typeof item === "string")
  );
}

export function isGeneratedImageOutput(value: unknown): value is GeneratedImageOutput {
  return (
    isRecord(value) &&
    Array.isArray(value.images) &&
    value.images.every(
      (item) =>
        isRecord(item) &&
        typeof item.filename === "string" &&
        item.filename.trim().length > 0 &&
        item.filename.length <= 160 &&
        typeof item.mediaType === "string" &&
        item.mediaType.startsWith("image/") &&
        typeof item.base64 === "string" &&
        isValidBase64ImagePayload(item.base64) &&
        typeof item.prompt === "string" &&
        item.prompt.trim().length > 0 &&
        typeof item.model === "string" &&
        item.model.trim().length > 0 &&
        (item.editMode === undefined || isImageEditMode(item.editMode)) &&
        (item.sourceImageName === undefined || (typeof item.sourceImageName === "string" && item.sourceImageName.trim().length > 0)),
    )
  );
}

export function isBrollOutput(value: unknown): value is BrollOutput {
  return isRecord(value) && Array.isArray(value.suggestions) && value.suggestions.every(isBrollSuggestion);
}

export function isVideoProjectOutput(value: unknown): value is VideoProjectOutput {
  return (
    isRecord(value) &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    (value.aspectRatio === "16:9" || value.aspectRatio === "9:16" || value.aspectRatio === "1:1" || value.aspectRatio === "4:5") &&
    typeof value.summary === "string" &&
    value.summary.trim().length > 0 &&
    (value.exportPreset === "mp4-1080p" || value.exportPreset === "webm-1080p" || value.exportPreset === "gif-social" || value.exportPreset === "project-bundle") &&
    Array.isArray(value.scenes) &&
    value.scenes.length > 0 &&
    value.scenes.every(isVideoProjectScene) &&
    Array.isArray(value.notes) &&
    value.notes.every((item) => typeof item === "string" && item.trim().length > 0)
  );
}

export function isSmartCutOutput(value: unknown): value is SmartCutOutput {
  return (
    isRecord(value) &&
    typeof value.objective === "string" &&
    Array.isArray(value.cuts) &&
    value.cuts.every(isSmartCutSuggestion)
  );
}

export function isRepurposeOutput(value: unknown): value is RepurposeOutput {
  return isRecord(value) && Array.isArray(value.clips) && value.clips.every(isRepurposeClipSuggestion);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function isCaptionOutputLike(
  value: unknown,
): value is { captions?: CaptionChunk[]; captionChunks: CaptionChunk[]; cleanedTranscript?: string; summary?: string } {
  if (!isRecord(value)) return false;
  return isCaptionArray(value.captions) || isCaptionArray(value.captionChunks);
}

function isCaptionArray(value: unknown): value is CaptionChunk[] {
  return Array.isArray(value) && value.every(isCaptionChunk);
}

function isCaptionChunk(value: unknown): value is CaptionChunk {
  if (!isRecord(value)) return false;

  const start = value.start;
  const end = value.end;

  return (
    isBoundedNumber(start, 0, Number.MAX_SAFE_INTEGER) &&
    isBoundedNumber(end, 0, Number.MAX_SAFE_INTEGER) &&
    end > start &&
    typeof value.text === "string" &&
    value.text.trim().length > 0 &&
    (value.emphasis === undefined || value.emphasis === "normal" || value.emphasis === "strong" || value.emphasis === "quiet")
  );
}

function isSmartCutSuggestion(value: unknown): value is SmartCutSuggestion {
  if (!isRecord(value)) return false;

  return (
    isBoundedNumber(value.start, 0, Number.MAX_SAFE_INTEGER) &&
    isBoundedNumber(value.end, 0, Number.MAX_SAFE_INTEGER) &&
    value.end > value.start &&
    (value.priority === "high" || value.priority === "medium" || value.priority === "low") &&
    (value.suggestedAction === "keep" ||
      value.suggestedAction === "trim" ||
      value.suggestedAction === "split" ||
      value.suggestedAction === "remove" ||
      value.suggestedAction === "caption") &&
    typeof value.reason === "string" &&
    value.reason.trim().length > 0
  );
}

function isBrollSuggestion(value: unknown): value is BrollSuggestion {
  if (!isRecord(value)) return false;

  return (
    typeof value.query === "string" &&
    value.query.trim().length >= 2 &&
    (value.mediaType === "image" || value.mediaType === "video") &&
    isBoundedNumber(value.start, 0, Number.MAX_SAFE_INTEGER) &&
    isBoundedNumber(value.end, 0, Number.MAX_SAFE_INTEGER) &&
    value.end > value.start &&
    typeof value.layerName === "string" &&
    value.layerName.trim().length > 0 &&
    (value.placement === "background" || value.placement === "overlay" || value.placement === "cutaway") &&
    typeof value.rationale === "string" &&
    value.rationale.trim().length > 0 &&
    Array.isArray(value.searchNotes) &&
    value.searchNotes.every((item) => typeof item === "string" && item.trim().length > 0)
  );
}

function isVideoProjectScene(value: unknown): value is VideoProjectScene {
  if (!isRecord(value)) return false;

  return (
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    isBoundedNumber(value.duration, 1, 45) &&
    typeof value.headline === "string" &&
    value.headline.trim().length > 0 &&
    typeof value.caption === "string" &&
    value.caption.trim().length > 0 &&
    typeof value.visualPrompt === "string" &&
    value.visualPrompt.trim().length > 0 &&
    (value.brollQuery === undefined || (typeof value.brollQuery === "string" && value.brollQuery.trim().length >= 2)) &&
    isHexColor(value.backgroundColor) &&
    isHexColor(value.accentColor)
  );
}

function isRepurposeClipSuggestion(value: unknown): value is RepurposeClipSuggestion {
  if (!isRecord(value)) return false;

  return (
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    isBoundedNumber(value.start, 0, Number.MAX_SAFE_INTEGER) &&
    isBoundedNumber(value.end, 0, Number.MAX_SAFE_INTEGER) &&
    value.end > value.start &&
    (value.platform === "youtube-shorts" ||
      value.platform === "instagram-reels" ||
      value.platform === "tiktok" ||
      value.platform === "linkedin" ||
      value.platform === "x") &&
    typeof value.caption === "string" &&
    Array.isArray(value.editNotes) &&
    value.editNotes.every((item) => typeof item === "string")
  );
}

function isBoundedNumber(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function isHexColor(value: unknown) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function isImageEditMode(value: unknown): value is AiImageEditMode {
  return value === "inpaint" || value === "outpaint" || value === "background-removal" || value === "cleanup" || value === "translate";
}
