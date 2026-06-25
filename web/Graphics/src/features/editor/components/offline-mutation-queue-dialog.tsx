"use client";

import {
  AlertTriangle,
  CheckCircle2,
  FileJson,
  RefreshCw,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type {
  OfflineSaveMutationReportEntry,
  OfflineSaveQueueReport,
} from "@/features/editor/offline-mutation-queue";
import { cn } from "@/lib/utils";

type OfflineMutationQueueDialogProps = {
  open: boolean;
  fileName: string;
  online: boolean;
  report: OfflineSaveQueueReport;
  activeMutationId: string | null;
  onOpenChange: (open: boolean) => void;
  onRetryLatest: () => void;
  onRetryMutation: (entryId: string) => void;
  onRestoreMutation: (entryId: string) => void;
  onRemoveMutation: (entryId: string) => void;
  onClearSynced: () => void;
  onExportEvidence: () => void;
};

export function OfflineMutationQueueDialog({
  open,
  fileName,
  online,
  report,
  activeMutationId,
  onOpenChange,
  onRetryLatest,
  onRetryMutation,
  onRestoreMutation,
  onRemoveMutation,
  onClearSynced,
  onExportEvidence,
}: OfflineMutationQueueDialogProps) {
  const hasRetryableEntries = report.retryableCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Offline save queue</DialogTitle>
          <DialogDescription>
            {fileName} has {report.retryableCount} retryable save
            {report.retryableCount === 1 ? "" : "s"} and {report.syncedCount}{" "}
            synced snapshot{report.syncedCount === 1 ? "" : "s"}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-2">
          <QueueMetric label="Queued" value={report.pendingCount} />
          <QueueMetric label="Failed" value={report.failedCount} tone="warning" />
          <QueueMetric label="Drift" value={report.staleCount} tone="warning" />
          <QueueMetric label="Synced" value={report.syncedCount} tone="good" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/30 p-2 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                "size-2 rounded-full",
                online ? "bg-emerald-500" : "bg-amber-500",
              )}
            />
            <span className="truncate text-muted-foreground">
              {online ? "Network available" : "Working offline"}
            </span>
          </div>
          <div className="truncate font-mono text-muted-foreground">
            {report.currentDocumentHash}
          </div>
        </div>

        {report.latestError ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 break-words">{report.latestError}</span>
          </div>
        ) : null}

        <ScrollArea className="max-h-[360px] rounded-md border border-border">
          {report.entries.length > 0 ? (
            <div className="divide-y divide-border">
              {report.entries.map((entry) => (
                <QueueEntryRow
                  key={entry.id}
                  entry={entry}
                  isActive={activeMutationId === entry.id}
                  onRetryMutation={onRetryMutation}
                  onRestoreMutation={onRestoreMutation}
                  onRemoveMutation={onRemoveMutation}
                />
              ))}
            </div>
          ) : (
            <div className="p-4 text-sm text-muted-foreground">
              No offline save snapshots are waiting.
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!hasRetryableEntries || activeMutationId !== null}
              onClick={onRetryLatest}
            >
              <RefreshCw className="size-4" />
              Retry latest
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={report.entries.length === 0}
              onClick={onExportEvidence}
            >
              <FileJson className="size-4" />
              Export evidence
            </Button>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={report.syncedCount === 0}
            onClick={onClearSynced}
          >
            Clear synced
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QueueMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "good" | "warning";
}) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "text-lg font-semibold",
          tone === "good" && "text-emerald-400",
          tone === "warning" && value > 0 && "text-amber-300",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function QueueEntryRow({
  entry,
  isActive,
  onRetryMutation,
  onRestoreMutation,
  onRemoveMutation,
}: {
  entry: OfflineSaveMutationReportEntry;
  isActive: boolean;
  onRetryMutation: (entryId: string) => void;
  onRestoreMutation: (entryId: string) => void;
  onRemoveMutation: (entryId: string) => void;
}) {
  const canRetry = entry.status === "queued" || entry.status === "failed";

  return (
    <div className="space-y-2 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={entry.status === "failed" ? "destructive" : "secondary"}>
              {entry.status}
            </Badge>
            {entry.isCurrentSnapshot ? (
              <Badge className="bg-emerald-500/15 text-emerald-300">
                Current snapshot
              </Badge>
            ) : (
              <Badge className="bg-amber-500/15 text-amber-200">
                Snapshot drift
              </Badge>
            )}
          </div>
          <div className="truncate text-sm font-medium">
            {entry.operation.replaceAll("-", " ")}
          </div>
          <div className="text-xs text-muted-foreground">
            Created {formatQueueTime(entry.createdAt)} - attempts{" "}
            {entry.attemptCount}
          </div>
          {entry.lastError ? (
            <div className="break-words text-xs text-amber-200">
              {entry.lastError}
            </div>
          ) : null}
        </div>
        <div className="shrink-0 text-right font-mono text-[10px] text-muted-foreground">
          <div>{entry.documentHash}</div>
          <div>{entry.baseUpdatedAt}</div>
        </div>
      </div>
      <Separator />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!canRetry || isActive}
          onClick={() => onRetryMutation(entry.id)}
        >
          {isActive ? (
            <RefreshCw className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Retry
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onRestoreMutation(entry.id)}
        >
          {entry.status === "synced" ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <RotateCcw className="size-4" />
          )}
          Restore
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onRemoveMutation(entry.id)}
        >
          <Trash2 className="size-4" />
          Remove
        </Button>
      </div>
    </div>
  );
}

function formatQueueTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
