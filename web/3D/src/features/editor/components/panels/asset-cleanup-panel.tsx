"use client";

import { useMemo, useState } from "react";
import { Recycle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { analyzeAssetCleanup, removeDuplicateSavedAssets, removeUnusedSavedAssets } from "../../utils/asset-cleanup";
import { useEditorStore } from "../../store/editor-store";

function formatBytes(bytes: number) {
  if (bytes <= 0) {
    return "0 KB";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRemoved(materials: number, audio: number) {
  const total = materials + audio;

  if (total === 0) {
    return "No saved asset entries removed.";
  }

  return `Removed ${materials} material and ${audio} audio saved asset${total === 1 ? "" : "s"}.`;
}

export function AssetCleanupPanel() {
  const [message, setMessage] = useState<string | null>(null);
  const document = useEditorStore((state) => state.document);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const replaceDocument = useEditorStore((state) => state.replaceDocument);
  const report = useMemo(() => analyzeAssetCleanup(document), [document]);
  const duplicateSavedAssets = report.duplicateSavedAudioAssets + report.duplicateSavedMaterialAssets;
  const unusedSavedAssets = report.unusedAudioAssets + report.unusedMaterialAssets;

  function handleRemoveDuplicates() {
    const result = removeDuplicateSavedAssets(document);
    replaceDocument(result.document, selectedObjectId);
    setMessage(formatRemoved(result.removedMaterialAssets, result.removedAudioAssets));
  }

  function handleRemoveUnused() {
    const result = removeUnusedSavedAssets(document);
    replaceDocument(result.document, selectedObjectId);
    setMessage(formatRemoved(result.removedMaterialAssets, result.removedAudioAssets));
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <Recycle className="size-4 shrink-0" />
          <span className="truncate">Asset cleanup</span>
        </div>
        <Badge className="rounded-md text-[11px]" variant="secondary">
          {report.totalEmbeddedReferences}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-muted/50 p-2">
          <div className="font-mono text-sm">{report.duplicateEmbeddedReferences}</div>
          <div className="text-muted-foreground">duplicate refs</div>
        </div>
        <div className="rounded-md bg-muted/50 p-2">
          <div className="font-mono text-sm">{formatBytes(report.duplicateEmbeddedBytes)}</div>
          <div className="text-muted-foreground">repeated payload</div>
        </div>
        <div className="rounded-md bg-muted/50 p-2">
          <div className="font-mono text-sm">{duplicateSavedAssets}</div>
          <div className="text-muted-foreground">saved duplicates</div>
        </div>
        <div className="rounded-md bg-muted/50 p-2">
          <div className="font-mono text-sm">{unusedSavedAssets}</div>
          <div className="text-muted-foreground">unused saved</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button className="gap-2" disabled={duplicateSavedAssets === 0} size="sm" variant="secondary" onClick={handleRemoveDuplicates}>
          <Recycle className="size-4" />
          Dedupe saved
        </Button>
        <Button className="gap-2" disabled={unusedSavedAssets === 0} size="sm" variant="secondary" onClick={handleRemoveUnused}>
          <Trash2 className="size-4" />
          Remove unused
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Embedded duplicate payloads are reported for export planning; cleanup only removes duplicate or unused saved library entries.
      </p>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
