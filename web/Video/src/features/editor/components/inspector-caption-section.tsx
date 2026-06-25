"use client";

import type { ChangeEvent } from "react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CaptionCueListEditor } from "@/features/editor/components/caption-cue-list-editor";
import { CaptionImportPreview } from "@/features/editor/components/caption-import-preview";
import { useEditorStore } from "@/features/editor/state/editor-store";
import type { SubtitleCue, TimelineLayer } from "@/lib/editor/types";
import { normalizeSubtitleCues } from "@/lib/subtitles/cue-operations";
import { downloadTextFile, formatSrt, formatTranscript, formatVtt, parseSubtitleFile } from "@/lib/subtitles/srt-vtt";
import type { TranscriptCutProposal } from "@/lib/subtitles/transcript-cuts";

export function InspectorCaptionSection({ layer }: { layer: TimelineLayer }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const updateLayer = useEditorStore((state) => state.updateLayer);
  const addSubtitleLayerFromCues = useEditorStore((state) => state.addSubtitleLayerFromCues);
  const applyTimelineCutRanges = useEditorStore((state) => state.applyTimelineCutRanges);
  const [captionMessage, setCaptionMessage] = useState<string | null>(null);
  const [isImportingCaptions, setIsImportingCaptions] = useState(false);
  const [pendingCaptionImport, setPendingCaptionImport] = useState<{ filename: string; cues: SubtitleCue[] } | null>(null);
  const text = (layer.cues ?? []).map((cue) => `${cue.start}-${cue.end} ${cue.text}`).join("\n");

  function applyCues(cues: SubtitleCue[]) {
    const normalizedCues = normalizeSubtitleCues(cues);
    updateLayer(layer.id, {
      cues: normalizedCues,
      duration: Math.max(layer.duration, ...normalizedCues.map((cue) => cue.end), 5),
    });
  }

  async function importCaptions(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImportingCaptions(true);
    setCaptionMessage(null);

    try {
      const cues = normalizeSubtitleCues(parseSubtitleFile(await file.text()));
      if (cues.length === 0) {
        setCaptionMessage("No captions found in this file.");
        return;
      }

      setPendingCaptionImport({ filename: file.name, cues });
      setCaptionMessage(`${cues.length} caption${cues.length === 1 ? "" : "s"} ready to import.`);
    } catch {
      setCaptionMessage("Caption file could not be imported.");
    } finally {
      setIsImportingCaptions(false);
      event.target.value = "";
    }
  }

  function replaceImportedCaptions(cues: SubtitleCue[]) {
    applyCues(cues);
    setPendingCaptionImport(null);
    setCaptionMessage(`${cues.length} caption${cues.length === 1 ? "" : "s"} replaced.`);
  }

  function mergeImportedCaptions(cues: SubtitleCue[]) {
    applyCues([...(layer.cues ?? []), ...cues]);
    setPendingCaptionImport(null);
    setCaptionMessage(`${cues.length} caption${cues.length === 1 ? "" : "s"} merged.`);
  }

  function createCaptionLayerFromImport(filename: string, cues: SubtitleCue[]) {
    const layerId = addSubtitleLayerFromCues({ name: filename.replace(/\.[^.]+$/, "") || "Imported captions", cues });
    setPendingCaptionImport(null);
    setCaptionMessage(layerId ? "Caption layer created." : "Caption layer could not be created.");
  }

  function exportCaptions(filename: string, content: string, type: string) {
    try {
      downloadTextFile(filename, content, type);
      setCaptionMessage("Caption file downloaded.");
    } catch {
      setCaptionMessage("Caption file could not be downloaded.");
    }
  }

  function applyTranscriptCuts(proposals: TranscriptCutProposal[]) {
    return applyTimelineCutRanges(
      proposals.map((proposal) => ({
        start: Math.max(layer.start, layer.start + proposal.start - layer.trimStart),
        end: Math.min(layer.start + layer.duration, layer.start + proposal.end - layer.trimStart),
        reason: proposal.reason,
      })),
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-muted-foreground">Captions</Label>
        <div className="flex gap-1">
          <input ref={inputRef} hidden type="file" accept=".srt,.vtt,text/vtt" onChange={importCaptions} />
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={isImportingCaptions}>
            Import
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportCaptions(`${layer.name}.srt`, formatSrt(layer.cues ?? []), "application/x-subrip")}
          >
            SRT
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportCaptions(`${layer.name}.vtt`, formatVtt(layer.cues ?? []), "text/vtt")}
          >
            VTT
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportCaptions(`${layer.name}-transcript.txt`, formatTranscript(layer.cues ?? []), "text/plain")}
          >
            TXT
          </Button>
        </div>
      </div>
      {captionMessage ? <div className="rounded-md border border-border p-2 text-xs text-muted-foreground">{captionMessage}</div> : null}
      {pendingCaptionImport ? (
        <CaptionImportPreview
          filename={pendingCaptionImport.filename}
          cues={pendingCaptionImport.cues}
          onReplace={() => replaceImportedCaptions(pendingCaptionImport.cues)}
          onMerge={() => mergeImportedCaptions(pendingCaptionImport.cues)}
          onNewLayer={() => createCaptionLayerFromImport(pendingCaptionImport.filename, pendingCaptionImport.cues)}
          onCancel={() => setPendingCaptionImport(null)}
        />
      ) : null}
      <CaptionCueListEditor cues={layer.cues ?? []} duration={Math.max(layer.duration, 5)} onChange={applyCues} onApplyCuts={applyTranscriptCuts} />
      <Textarea value={text} onChange={(event) => applyCues(parseManualCaptionText(event.target.value, layer.cues))} />
    </div>
  );
}

function parseManualCaptionText(value: string, existingCues: SubtitleCue[] = []) {
  return normalizeSubtitleCues(value.split("\n").map((line, index) => parseManualCaptionLine(line, index, existingCues[index]?.id)));
}

function parseManualCaptionLine(line: string, index: number, existingId?: string): SubtitleCue {
  const fallbackStart = index * 2;
  const fallbackEnd = fallbackStart + 2;
  const match = line.match(/^\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(.*)$/);
  if (!match) {
    return createManualCaptionCue(existingId, fallbackStart, fallbackEnd, line.trim());
  }

  const start = Number(match[1]);
  const end = Number(match[2]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return createManualCaptionCue(existingId, fallbackStart, fallbackEnd, (match[3] ?? line).trim());
  }

  return createManualCaptionCue(existingId, start, end, (match[3] ?? "").trim());
}

function createManualCaptionCue(existingId: string | undefined, start: number, end: number, text: string): SubtitleCue {
  return {
    id: existingId ?? crypto.randomUUID(),
    start,
    end,
    text,
    emphasis: "normal",
  };
}
