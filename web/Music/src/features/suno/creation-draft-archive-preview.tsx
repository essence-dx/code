"use client";

import { FileJson } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CreationDraftArchivePreview } from "@/features/ai/creation-drafts";

type CreationDraftArchivePreviewProps = {
  currentDraftCount: number;
  fileName: string;
  onCancel: () => void;
  onExportCurrent: () => void;
  onConfirm: () => void;
  preview: CreationDraftArchivePreview;
};

export function CreationDraftArchivePreview({
  currentDraftCount,
  fileName,
  onCancel,
  onExportCurrent,
  onConfirm,
  preview,
}: CreationDraftArchivePreviewProps) {
  const details = [
    preview.duplicates ? `${preview.duplicates} duplicate` : "",
    preview.invalid ? `${preview.invalid} invalid` : "",
    preview.capacityLimited ? `${preview.capacityLimited} over limit` : "",
  ].filter(Boolean);

  return (
    <div className="mt-3 rounded-md border border-amber-400/30 bg-amber-400/10 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <FileJson className="size-4 text-amber-200" />
            <p className="font-medium text-amber-100">Review archive import</p>
            <Badge variant="outline">{archiveScopeLabel(preview.archiveScope)}</Badge>
            <Badge variant="secondary">
              {preview.version ? `v${preview.version}` : "legacy"}
            </Badge>
          </div>
          <p className="mt-1 truncate text-sm text-amber-50/80">
            {fileName}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {preview.importable} of {preview.total} draft
            {preview.total === 1 ? "" : "s"} can be added locally.
          </p>
          {details.length ? (
            <p className="mt-1 text-xs text-amber-100/80">
              Skips: {details.join(", ")}.
            </p>
          ) : null}
          <p className="mt-2 text-xs text-amber-100/80">
            A recovery snapshot will be saved before this import changes your
            draft vault.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!currentDraftCount}
            title="Export current creation draft vault"
            onClick={onExportCurrent}
          >
            Export current
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!preview.importable}
            title="Import reviewed creation drafts"
            onClick={onConfirm}
          >
            Import {preview.importable}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            title="Cancel archive import"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function archiveScopeLabel(scope: CreationDraftArchivePreview["archiveScope"]) {
  if (scope === "selected-visible") {
    return "Selected archive";
  }

  if (scope === "full-vault") {
    return "Full archive";
  }

  return "Legacy archive";
}
