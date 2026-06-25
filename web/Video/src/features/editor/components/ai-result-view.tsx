"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Captions, Check, ImageIcon, Scissors, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageResponse } from "@/components/ai-elements/message";
import { AiBrollReview, type BrollInsertSummary } from "@/features/editor/components/ai-broll-review";
import { AiVideoProjectReview, type VideoProjectSaveOptions, type VideoProjectSaveSummary } from "@/features/editor/components/ai-video-project-review";
import {
  isBrollOutput,
  isCaptionOutputLike,
  isGeneratedImageOutput,
  isRecord,
  isRepurposeOutput,
  isSmartCutOutput,
  isSubtitleStyleOutput,
  isSubtitleTranslationOutput,
  isVideoProjectOutput,
  type AiResult,
  type BrollSuggestion,
  type CaptionChunk,
  type GeneratedImageOutput,
  type RepurposeClipSuggestion,
  type RepurposeOutput,
  type SmartCutOutput,
  type SmartCutSuggestion,
  type VideoProjectOutput,
} from "@/features/editor/components/ai-result-types";
import { formatTime } from "@/lib/editor/factory";
import { imageDataUrl } from "@/lib/media/base64-image";
import { downloadTextFile, formatSrt, formatVtt } from "@/lib/subtitles/srt-vtt";

export function AiResultView({
  result,
  onApplyCaptions,
  onInsertBroll,
  onSaveVideoProject,
  onApplySmartCuts,
  onSaveClipVariants,
  sceneVideoConfigured,
  sceneVideoStatusLabel,
}: {
  result: AiResult;
  onApplyCaptions: (captions: CaptionChunk[]) => void;
  onInsertBroll?: (suggestions: BrollSuggestion[]) => Promise<BrollInsertSummary>;
  onSaveVideoProject?: (output: VideoProjectOutput, options?: VideoProjectSaveOptions) => Promise<VideoProjectSaveSummary>;
  onApplySmartCuts?: (cuts: SmartCutSuggestion[]) => AppliedSmartCutSummary;
  onSaveClipVariants?: (clips: RepurposeClipSuggestion[]) => Promise<ClipVariantSaveSummary>;
  sceneVideoConfigured?: boolean;
  sceneVideoStatusLabel?: string;
}) {
  const output = result.output;

  if (result.action === "script" && isRecord(output)) {
    return (
      <ResultStack>
        <ResultBlock title={stringValue(output, "title")}>
          <MessageResponse>{stringValue(output, "hook")}</MessageResponse>
        </ResultBlock>
        {arrayValue(output, "scenes").map((scene, index) =>
          isRecord(scene) ? (
            <ResultBlock key={index} title={stringValue(scene, "label") || `Scene ${index + 1}`}>
              <MessageResponse>
                {[
                  `${numberValue(scene, "seconds")}s`,
                  stringValue(scene, "narration"),
                  stringValue(scene, "visualDirection"),
                  stringValue(scene, "onScreenText"),
                ]
                  .filter(Boolean)
                  .join("\n\n")}
              </MessageResponse>
            </ResultBlock>
          ) : null,
        )}
        <ResultBlock title="Call to action">
          <MessageResponse>{stringValue(output, "callToAction")}</MessageResponse>
        </ResultBlock>
      </ResultStack>
    );
  }

  if ((result.action === "captions" || result.action === "transcript-cleanup") && isCaptionOutputLike(output)) {
    const captions = output.captions ?? output.captionChunks;

    return (
      <ResultStack>
        {"cleanedTranscript" in output ? (
          <ResultBlock title="Clean transcript">
            <MessageResponse>{output.cleanedTranscript}</MessageResponse>
          </ResultBlock>
        ) : null}
        {"summary" in output ? (
          <ResultBlock title="Summary">
            <MessageResponse>{output.summary}</MessageResponse>
          </ResultBlock>
        ) : null}
        <Button size="sm" variant="outline" onClick={() => onApplyCaptions(captions)}>
          <Captions className="size-4" />
          Add captions
        </Button>
        <div className="space-y-2">
          {captions.map((caption, index) => (
            <ResultBlock key={index} title={`${formatTime(caption.start)} - ${formatTime(caption.end)}`}>
              <MessageResponse>{caption.text}</MessageResponse>
            </ResultBlock>
          ))}
        </div>
      </ResultStack>
    );
  }

  if (result.action === "smart-cut" && isSmartCutOutput(output)) {
    return <SmartCutReview output={output} onApplySmartCuts={onApplySmartCuts} />;
  }

  if (result.action === "b-roll" && isBrollOutput(output)) {
    return <AiBrollReview output={output} onInsertBroll={onInsertBroll} />;
  }

  if (result.action === "video-project" && isVideoProjectOutput(output)) {
    return (
      <AiVideoProjectReview
        output={output}
        onSaveVideoProject={onSaveVideoProject}
        sceneVideoConfigured={sceneVideoConfigured}
        sceneVideoStatusLabel={sceneVideoStatusLabel}
      />
    );
  }

  if (result.action === "subtitle-style" && isSubtitleStyleOutput(output)) {
    return (
      <ResultStack>
        <ResultBlock title="Applied subtitle style">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-6 w-10 rounded-sm border border-border" style={{ background: output.style.fill }} />
            <span className="h-6 w-10 rounded-sm border border-border" style={{ background: output.style.background }} />
            <Badge variant="secondary">{output.style.fontSize}px</Badge>
            <Badge variant="secondary">{output.style.fontWeight}</Badge>
          </div>
          <MessageResponse>{output.rationale}</MessageResponse>
        </ResultBlock>
        {output.sampleCaptions.map((caption, index) => (
          <ResultBlock key={index} title={`Sample ${index + 1}`}>
            <MessageResponse>{caption}</MessageResponse>
          </ResultBlock>
        ))}
      </ResultStack>
    );
  }

  if (result.action === "subtitle-translation" && isSubtitleTranslationOutput(output)) {
    return (
      <ResultStack>
        <ResultBlock title={`${output.sourceLanguage} to ${output.targetLanguage}`}>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onApplyCaptions(output.translatedCaptions)}>
              <Captions className="size-4" />
              Add translated captions
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                downloadTextFile(`translated-${output.targetLanguage}.srt`, formatSrt(captionChunksForExport(output.translatedCaptions)), "application/x-subrip")
              }
            >
              SRT
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadTextFile(`translated-${output.targetLanguage}.vtt`, formatVtt(captionChunksForExport(output.translatedCaptions)), "text/vtt")}
            >
              VTT
            </Button>
          </div>
        </ResultBlock>
        {output.notes.length ? (
          <ResultBlock title="Notes">
            <MessageResponse>{output.notes.join("\n")}</MessageResponse>
          </ResultBlock>
        ) : null}
        <div className="space-y-2">
          {output.translatedCaptions.map((caption, index) => (
            <ResultBlock key={index} title={`${formatTime(caption.start)} - ${formatTime(caption.end)}`}>
              <MessageResponse>{caption.text}</MessageResponse>
            </ResultBlock>
          ))}
        </div>
      </ResultStack>
    );
  }

  if ((result.action === "image" || result.action === "image-edit") && isGeneratedImageOutput(output)) {
    return (
      <ResultStack>
        {output.images.map((image) => (
          <ResultBlock key={image.filename} title={image.filename}>
            <div className="space-y-3">
              <div className="overflow-hidden rounded-md border border-border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageSource(image)} alt={image.prompt} className="max-h-64 w-full object-contain" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{image.mediaType}</Badge>
                <Badge variant="outline">{image.model}</Badge>
                {image.editMode ? <Badge variant="outline">{image.editMode}</Badge> : null}
                {image.sourceImageName ? <Badge variant="secondary">{image.sourceImageName}</Badge> : null}
              </div>
              <MessageResponse>{image.prompt}</MessageResponse>
            </div>
          </ResultBlock>
        ))}
        {output.note ? (
          <ResultBlock title="Generation note">
            <MessageResponse>{output.note}</MessageResponse>
          </ResultBlock>
        ) : null}
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <ImageIcon className="size-4" />
          Saved to media and added to the canvas.
        </div>
      </ResultStack>
    );
  }

  if (result.action === "repurpose" && isRepurposeOutput(output)) {
    return <RepurposeClipVariantReview output={output} onSaveClipVariants={onSaveClipVariants} />;
  }

  if (result.action === "edit-plan" && isRecord(output)) {
    return (
      <ResultStack>
        <ResultBlock title="Objective">
          <MessageResponse>{stringValue(output, "objective")}</MessageResponse>
        </ResultBlock>
        {arrayValue(output, "steps").map((step, index) =>
          isRecord(step) ? (
            <ResultBlock key={index} title={`${index + 1}. ${stringValue(step, "tool")}`}>
              <MessageResponse>
                {[stringValue(step, "instruction"), step.targetTime === null ? null : `Target: ${formatTime(numberValue(step, "targetTime"))}`]
                  .filter(Boolean)
                  .join("\n\n")}
              </MessageResponse>
            </ResultBlock>
          ) : null,
        )}
        <ResultBlock title="Export preset">
          <MessageResponse>{stringValue(output, "exportPreset")}</MessageResponse>
        </ResultBlock>
      </ResultStack>
    );
  }

  return (
    <ResultBlock title="Result">
      <MessageResponse>{JSON.stringify(output, null, 2)}</MessageResponse>
    </ResultBlock>
  );
}

interface AppliedSmartCutSummary {
  changedLayerCount: number;
  removedLayerCount: number;
  createdLayerCount: number;
  rangeCount: number;
}

interface ClipVariantSaveSummary {
  savedCount: number;
  skippedCount: number;
}

function RepurposeClipVariantReview({
  output,
  onSaveClipVariants,
}: {
  output: RepurposeOutput;
  onSaveClipVariants?: (clips: RepurposeClipSuggestion[]) => Promise<ClipVariantSaveSummary>;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  async function saveClipVariants() {
    if (!onSaveClipVariants || isSaving || output.clips.length === 0) return;

    setIsSaving(true);
    setSaveMessage(null);
    try {
      const summary = await onSaveClipVariants(output.clips);
      setSaveMessage(clipVariantSaveMessage(summary));
    } catch {
      setSaveMessage("Clip variants could not be saved locally.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ResultStack>
      <ResultBlock title="Clip variants">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{output.clips.length} suggested</Badge>
          <Button size="sm" onClick={() => void saveClipVariants()} disabled={!onSaveClipVariants || isSaving || output.clips.length === 0}>
            {isSaving ? "Saving..." : "Save clip variants"}
          </Button>
        </div>
        {saveMessage ? <p className="mt-2 text-xs text-muted-foreground">{saveMessage}</p> : null}
      </ResultBlock>
      {output.clips.map((clip, index) => (
        <ResultBlock key={`${clip.title}-${clip.start}-${clip.end}-${index}`} title={`${clip.title} | ${formatTime(clip.start)} - ${formatTime(clip.end)}`}>
          <div className="mb-2">
            <Badge variant="outline">{clip.platform}</Badge>
          </div>
          <MessageResponse>{[clip.caption, ...clip.editNotes].join("\n\n")}</MessageResponse>
        </ResultBlock>
      ))}
    </ResultStack>
  );
}

function SmartCutReview({
  output,
  onApplySmartCuts,
}: {
  output: SmartCutOutput;
  onApplySmartCuts?: (cuts: SmartCutSuggestion[]) => AppliedSmartCutSummary;
}) {
  const [decisions, setDecisions] = useState<Record<string, boolean>>({});
  const [applyMessage, setApplyMessage] = useState<string | null>(null);
  const acceptedCuts = useMemo(
    () =>
      output.cuts.filter((cut, index) => {
        if (!isTimelineCutAction(cut)) return false;
        const id = smartCutDecisionId(cut, index);
        return decisions[id] ?? defaultSmartCutAccepted(cut);
      }),
    [decisions, output.cuts],
  );

  function setAccepted(cut: SmartCutSuggestion, index: number, accepted: boolean) {
    setApplyMessage(null);
    setDecisions((current) => ({
      ...current,
      [smartCutDecisionId(cut, index)]: accepted,
    }));
  }

  function applyAcceptedCuts() {
    if (!onApplySmartCuts || acceptedCuts.length === 0) return;

    const summary = onApplySmartCuts(acceptedCuts);
    setApplyMessage(smartCutApplyMessage(summary));
  }

  return (
    <ResultStack>
      <ResultBlock title="Objective">
        <MessageResponse>{output.objective}</MessageResponse>
      </ResultBlock>
      <ResultBlock title="Review queue">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{acceptedCuts.length} accepted</Badge>
          <Badge variant="outline">{output.cuts.length} suggested</Badge>
          <Button size="sm" onClick={applyAcceptedCuts} disabled={!onApplySmartCuts || acceptedCuts.length === 0}>
            <Scissors className="size-4" />
            Apply accepted cuts
          </Button>
        </div>
        {applyMessage ? <p className="mt-2 text-xs text-muted-foreground">{applyMessage}</p> : null}
      </ResultBlock>
      {output.cuts.map((cut, index) => {
        const accepted = decisions[smartCutDecisionId(cut, index)] ?? defaultSmartCutAccepted(cut);
        const canCutTimeline = isTimelineCutAction(cut);

        return (
          <ResultBlock key={smartCutDecisionId(cut, index)} title={`${cut.suggestedAction} | ${formatTime(cut.start)} - ${formatTime(cut.end)}`}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant={cut.priority === "high" ? "default" : "secondary"}>{cut.priority}</Badge>
              <Badge variant={canCutTimeline ? "outline" : "secondary"}>{canCutTimeline ? "timeline cut" : "review note"}</Badge>
              {canCutTimeline ? (
                <div className="ml-auto flex gap-1">
                  <Button size="sm" variant={accepted ? "default" : "outline"} onClick={() => setAccepted(cut, index, true)}>
                    <Check className="size-4" />
                    Accept
                  </Button>
                  <Button size="sm" variant={accepted ? "outline" : "secondary"} onClick={() => setAccepted(cut, index, false)}>
                    <X className="size-4" />
                    Skip
                  </Button>
                </div>
              ) : null}
            </div>
            <MessageResponse>{cut.reason}</MessageResponse>
          </ResultBlock>
        );
      })}
    </ResultStack>
  );
}

function ResultStack({ children }: { children: ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

function ResultBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-background p-3 text-sm">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title || "Result"}</div>
      <div className="text-foreground">{children}</div>
    </div>
  );
}

function arrayValue(value: Record<string, unknown>, key: string) {
  return Array.isArray(value[key]) ? value[key] : [];
}

function stringValue(value: Record<string, unknown>, key: string) {
  const item = value[key];
  return typeof item === "string" ? item : "";
}

function numberValue(value: Record<string, unknown>, key: string) {
  const item = value[key];
  return typeof item === "number" && Number.isFinite(item) ? item : 0;
}

function isTimelineCutAction(cut: SmartCutSuggestion) {
  return cut.suggestedAction === "remove" || cut.suggestedAction === "trim" || cut.suggestedAction === "split";
}

function defaultSmartCutAccepted(cut: SmartCutSuggestion) {
  return isTimelineCutAction(cut) && cut.priority !== "low";
}

function smartCutDecisionId(cut: SmartCutSuggestion, index: number) {
  return `${index}:${cut.start}:${cut.end}:${cut.suggestedAction}`;
}

function smartCutApplyMessage(summary: AppliedSmartCutSummary) {
  if (summary.rangeCount === 0) return "No accepted timeline cuts were applied.";
  if (summary.changedLayerCount === 0) return `${summary.rangeCount} cut range${summary.rangeCount === 1 ? "" : "s"} reviewed; no editable layers crossed those ranges.`;

  return `${summary.rangeCount} cut range${summary.rangeCount === 1 ? "" : "s"} applied across ${summary.changedLayerCount} layer${
    summary.changedLayerCount === 1 ? "" : "s"
  }. ${summary.createdLayerCount} segment${summary.createdLayerCount === 1 ? "" : "s"} created, ${summary.removedLayerCount} removed.`;
}

function clipVariantSaveMessage(summary: ClipVariantSaveSummary) {
  if (summary.savedCount === 0) return "No valid clip variants were saved.";

  const skipped = summary.skippedCount > 0 ? ` ${summary.skippedCount} invalid clip${summary.skippedCount === 1 ? "" : "s"} skipped.` : "";
  return `${summary.savedCount} clip variant${summary.savedCount === 1 ? "" : "s"} saved locally.${skipped}`;
}

function imageSource(image: GeneratedImageOutput["images"][number]) {
  return imageDataUrl(image.mediaType, image.base64);
}

function captionChunksForExport(captions: CaptionChunk[]) {
  return captions.map((caption, index) => ({
    id: `ai_translation_${index}`,
    start: caption.start,
    end: caption.end,
    text: caption.text,
    emphasis: caption.emphasis ?? "normal",
  }));
}
