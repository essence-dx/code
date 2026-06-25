"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Download, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  downloadSelfHostedUploadEvidence,
  importSelfHostedUploadEvidenceFile,
  type SelfHostedUploadHistoryEntry,
} from "@/lib/media/self-hosted-upload-history";

type SelfHostedUploadHistoryListProps = {
  entries: SelfHostedUploadHistoryEntry[];
  onEntriesChange?: (entries: SelfHostedUploadHistoryEntry[]) => void;
};

export function SelfHostedUploadHistoryList({ entries, onEntriesChange }: SelfHostedUploadHistoryListProps) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const visibleEntries = entries.slice(0, 3);

  async function importEvidence(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setImportError(null);
      onEntriesChange?.(await importSelfHostedUploadEvidenceFile(file));
    } catch {
      setImportError("Upload evidence packet could not be imported.");
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Recent upload checks</span>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{entries.length}</Badge>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            disabled={entries.length === 0}
            onClick={() => downloadSelfHostedUploadEvidence(entries)}
            aria-label="Download upload evidence"
          >
            <Download className="size-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="size-7" onClick={() => importInputRef.current?.click()} aria-label="Import upload evidence">
            <Upload className="size-4" />
          </Button>
          <input ref={importInputRef} type="file" accept="application/json,.json" className="hidden" onChange={importEvidence} />
        </div>
      </div>
      {visibleEntries.length === 0 ? (
        <p className="text-xs text-muted-foreground">No upload checks yet.</p>
      ) : (
        <div className="space-y-2">
          {visibleEntries.map((entry) => (
            <div key={entry.id} className="grid gap-1 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{entry.assetName}</span>
                <Badge variant={uploadStatusVariant(entry.status)}>{uploadStatusLabel(entry)}</Badge>
              </div>
              <span className="truncate text-muted-foreground">{entry.publicUrl}</span>
              <span className="text-muted-foreground">{formatUploadCheckTime(entry.checkedAt)}</span>
            </div>
          ))}
        </div>
      )}
      {importError ? <p className="text-xs text-destructive">{importError}</p> : null}
    </div>
  );
}

function uploadStatusVariant(status: SelfHostedUploadHistoryEntry["status"]) {
  if (status === "verified") return "secondary";
  if (status === "failed") return "destructive";
  return "outline";
}

function uploadStatusLabel(entry: SelfHostedUploadHistoryEntry) {
  if (entry.status === "verified") return "Verified";
  if (entry.status === "failed") return entry.httpStatus ? `HTTP ${entry.httpStatus}` : "Failed";
  return "Limited";
}

function formatUploadCheckTime(value: number) {
  return new Date(value).toLocaleString([], {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
}
