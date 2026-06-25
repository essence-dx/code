import { CheckCircle2, Cpu, FileCog, RotateCcw, Timer, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProjectCadConversionJobRecord, ProjectCadConversionJobStatus, ProjectCadConversionQueueReport } from "@/features/projects/cad-conversion-worker";

function statusVariant(status: ProjectCadConversionJobStatus) {
  if (status === "failed") {
    return "destructive" as const;
  }

  if (status === "retryable-failed" || status === "running") {
    return "secondary" as const;
  }

  return "outline" as const;
}

function statusIcon(status: ProjectCadConversionJobStatus) {
  if (status === "succeeded") {
    return <CheckCircle2 className="size-3.5" />;
  }

  if (status === "queued" || status === "running") {
    return <Timer className="size-3.5" />;
  }

  if (status === "retryable-failed") {
    return <RotateCcw className="size-3.5" />;
  }

  return <TriangleAlert className="size-3.5" />;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function formatMegabytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CadConversionJobRow({ job }: { job: ProjectCadConversionJobRecord }) {
  const latestLog = job.logs.at(-1);

  return (
    <TableRow>
      <TableCell>
        <div className="min-w-0">
          <p className="truncate font-medium">{job.sourceFileName}</p>
          <p className="truncate text-xs text-muted-foreground">{job.projectName}</p>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          <Badge className="rounded-md" variant="outline">
            {job.adapterId.toUpperCase()}
          </Badge>
          <Badge className="rounded-md" variant="secondary">
            {job.target.toUpperCase()}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(job.status)}>
          {statusIcon(job.status)}
          {job.status}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {job.attempts}/{job.maxAttempts}
      </TableCell>
      <TableCell>
        <div className="max-w-[300px]">
          <p className="truncate text-xs">{latestLog?.message ?? "No worker logs yet."}</p>
          <p className="truncate text-xs text-muted-foreground">
            {formatMegabytes(job.sourceBytes)} source / {job.diagnostics.meshDiagnostics.estimatedTriangleCount.toLocaleString()} triangles
          </p>
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{formatDate(job.nextAttemptAt ?? job.updatedAt)}</TableCell>
    </TableRow>
  );
}

export function ProjectCadConversionQueuePanel({ report }: { report: ProjectCadConversionQueueReport }) {
  const visibleJobs = report.jobs.slice(0, 10);

  return (
    <Card className="mt-4">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileCog className="size-4" />
              CAD conversion queue
            </CardTitle>
            <CardDescription>Queued FreeCAD and OCCT worker jobs with source diagnostics, logs, attempts, and retryable failures.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant="outline">
              <Cpu className="size-3.5" />
              {report.summary.totalCount} jobs
            </Badge>
            <Badge className="gap-1 rounded-md" variant={report.summary.retryableCount > 0 ? "secondary" : "outline"}>
              <RotateCcw className="size-3.5" />
              {report.summary.retryableCount} retryable
            </Badge>
            <Badge className="gap-1 rounded-md" variant={report.summary.failedCount > 0 ? "destructive" : "outline"}>
              <TriangleAlert className="size-3.5" />
              {report.summary.failedCount} failed
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Adapter</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Diagnostics</TableHead>
              <TableHead>Next</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleJobs.length > 0 ? (
              visibleJobs.map((job) => <CadConversionJobRow job={job} key={job.id ?? `${job.projectId}:${job.sourceFileName}:${job.queuedAt}`} />)
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={6}>
                  No CAD conversion jobs have been queued yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
