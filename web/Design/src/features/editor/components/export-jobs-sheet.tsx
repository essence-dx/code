"use client";

import { Download, RotateCcw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ExportJobSummary } from "@/features/editor/export-job-history";

type ExportJobsSheetProps = {
  open: boolean;
  jobs: ExportJobSummary[];
  onOpenChange: (open: boolean) => void;
  onRetryJob: (jobId: string) => void;
  onClearJobs: () => void;
};

const statusLabel: Record<ExportJobSummary["status"], string> = {
  queued: "Queued",
  running: "Running",
  completed: "Ready",
  failed: "Failed",
};

export function ExportJobsSheet({
  open,
  jobs,
  onOpenChange,
  onRetryJob,
  onClearJobs,
}: ExportJobsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Export jobs</SheetTitle>
          <SheetDescription>
            Track recent exports, retry failures, and download finished formats
            again.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between gap-3 px-4 pb-3">
          <Badge variant="secondary">{jobs.length} recent</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearJobs}
            disabled={jobs.length === 0}
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        </div>

        <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
          {jobs.length ? (
            <div className="space-y-3">
              {jobs.map((job) => (
                <article key={job.id} className="rounded-md border bg-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {job.formatLabel}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {job.artifactName ?? job.fileName}
                      </p>
                    </div>
                    <Badge
                      variant={
                        job.status === "failed"
                          ? "destructive"
                          : job.status === "completed"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {statusLabel[job.status]}
                    </Badge>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.max(4, job.progress)}%` }}
                    />
                  </div>

                  {job.failureMessage ? (
                    <p className="mt-2 text-xs text-destructive">
                      {job.failureMessage}
                    </p>
                  ) : null}

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {formatJobTime(job.completedAt ?? job.updatedAt)}
                    </p>
                    {job.status === "completed" || job.status === "failed" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRetryJob(job.id)}
                      >
                        {job.status === "completed" ? (
                          <Download className="h-4 w-4" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                        {job.status === "completed" ? "Download again" : "Retry"}
                      </Button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No export jobs yet.
            </p>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function formatJobTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Just now";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
