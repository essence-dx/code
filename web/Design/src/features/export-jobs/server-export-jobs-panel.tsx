"use client";

import { Download, ExternalLink, FileDown, RefreshCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatAssetBytes } from "@/features/assets/asset-library-audit";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";

type ServerExportJobsPanelProps = {
  jobs: ServerExportJobSummary[];
};

const statusLabel: Record<ServerExportJobSummary["status"], string> = {
  queued: "Queued",
  running: "Running",
  completed: "Ready",
  failed: "Failed",
};

export function ServerExportJobsPanel({ jobs }: ServerExportJobsPanelProps) {
  const runningCount = jobs.filter(
    (job) => job.status === "queued" || job.status === "running",
  ).length;
  const storedArtifactCount = jobs.filter((job) => job.artifactDataUrl).length;
  const failedCount = jobs.filter((job) => job.status === "failed").length;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileDown className="h-5 w-5" />
              Server export jobs
            </CardTitle>
            <CardDescription>
              Durable status and downloadable artifacts from recent exports.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{jobs.length} recent</Badge>
            {runningCount ? <Badge variant="outline">{runningCount} active</Badge> : null}
            {failedCount ? <Badge variant="destructive">{failedCount} failed</Badge> : null}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <ExportJobMetric label="Recent jobs" value={jobs.length} />
          <ExportJobMetric label="Stored files" value={storedArtifactCount} />
          <ExportJobMetric label="Needs attention" value={failedCount} />
        </div>
      </CardHeader>
      <CardContent>
        {jobs.length ? (
          <ScrollArea className="h-[360px] rounded-md border border-border">
            <div className="divide-y divide-border">
              {jobs.map((job) => (
                <ServerExportJobRow key={job.id} job={job} />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            Exports from the editor will appear here once they start syncing to
            the server.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ExportJobMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ServerExportJobRow({ job }: { job: ServerExportJobSummary }) {
  return (
    <article className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold">{job.formatLabel}</p>
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
          {job.artifactDataUrl ? <Badge variant="outline">Stored</Badge> : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {job.projectName} · {job.artifactName ?? job.fileName}
        </p>
        <div className="h-2 max-w-md overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.max(4, job.progress)}%` }}
          />
        </div>
        {job.failureMessage ? (
          <p className="text-xs text-destructive">{job.failureMessage}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <p className="text-xs text-muted-foreground">
          {job.artifactSizeBytes
            ? formatAssetBytes(job.artifactSizeBytes)
            : formatJobTime(job.updatedAt)}
        </p>
        {job.artifactDataUrl ? (
          <Button asChild size="sm" variant="outline">
            <a href={job.artifactDataUrl} download={job.artifactName ?? job.fileName}>
              <Download className="h-4 w-4" />
              Download
            </a>
          </Button>
        ) : job.status === "completed" ? (
          <Badge variant="outline">Metadata only</Badge>
        ) : null}
        {job.status === "failed" ? (
          <Button asChild size="sm" variant="outline">
            <a href={`/editor/${job.projectId}`}>
              <RefreshCcw className="h-4 w-4" />
              Retry
            </a>
          </Button>
        ) : (
          <Button asChild size="icon" variant="ghost" aria-label="Open project">
            <a href={`/editor/${job.projectId}`}>
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
    </article>
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
