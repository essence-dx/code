"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Download, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  SelfHostedUploadProfileReadinessReport,
  SelfHostedUploadProfileReadinessStatus,
} from "@/lib/media/self-hosted-upload-profile-readiness";
import {
  downloadSelfHostedUploadProfileReadinessEvidence,
  importSelfHostedUploadProfileReadinessEvidenceFile,
} from "@/lib/media/self-hosted-upload-profile-readiness";

type SelfHostedUploadProfileReadinessHistoryProps = {
  activeProfileId: string | null;
  history: SelfHostedUploadProfileReadinessReport[];
  onHistoryChange?: (history: SelfHostedUploadProfileReadinessReport[]) => void;
};

export function SelfHostedUploadProfileReadinessHistory({
  activeProfileId,
  history,
  onHistoryChange,
}: SelfHostedUploadProfileReadinessHistoryProps) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const activeHistory = activeProfileId ? history.filter((report) => report.profileId === activeProfileId) : [];
  const visibleHistory = (activeHistory.length > 0 ? activeHistory : history).slice(0, 3);

  async function importEvidence(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setImportError(null);
      onHistoryChange?.(await importSelfHostedUploadProfileReadinessEvidenceFile(file));
    } catch {
      setImportError("Profile readiness evidence packet could not be imported.");
    }
  }

  return (
    <div className="grid gap-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">Recent profile checks</div>
          <div className="truncate text-xs text-muted-foreground">
            {activeHistory.length > 0 ? "Latest checks for this storage profile." : "Latest saved checks across storage profiles."}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{history.length}</Badge>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            disabled={history.length === 0}
            onClick={() => downloadSelfHostedUploadProfileReadinessEvidence(history)}
            aria-label="Download profile readiness evidence"
          >
            <Download className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => importInputRef.current?.click()}
            aria-label="Import profile readiness evidence"
          >
            <Upload className="size-4" />
          </Button>
          <input ref={importInputRef} type="file" accept="application/json,.json" className="hidden" onChange={importEvidence} />
        </div>
      </div>
      {visibleHistory.length === 0 ? (
        <p className="text-xs text-muted-foreground">No profile checks yet.</p>
      ) : (
        <div className="grid gap-2">
          {visibleHistory.map((report) => (
            <div key={`${report.profileId}:${report.checkedAt}`} className="grid gap-1 rounded-md bg-muted/40 p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-xs font-medium">{report.profileName}</span>
                <Badge variant={readinessBadgeVariant(report.status)}>{readinessStatusLabel(report.status)}</Badge>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="min-w-0 truncate">{report.probeUrl}</span>
                <span className="shrink-0">{formatCheckedAt(report.checkedAt)}</span>
              </div>
              <span className="text-xs text-muted-foreground">{report.steps.length} checks saved</span>
            </div>
          ))}
        </div>
      )}
      {importError ? <p className="text-xs text-destructive">{importError}</p> : null}
    </div>
  );
}

function readinessBadgeVariant(status: SelfHostedUploadProfileReadinessStatus) {
  if (status === "ready") return "default";
  if (status === "failed") return "destructive";
  return "outline";
}

function readinessStatusLabel(status: SelfHostedUploadProfileReadinessStatus) {
  if (status === "ready") return "Ready";
  if (status === "failed") return "Failed";
  return "Limited";
}

function formatCheckedAt(checkedAt: number) {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(checkedAt));
}
