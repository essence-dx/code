import { Activity, Camera, CheckCircle2, Globe2, PackageCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  ProjectPublicSurfaceHealthReport,
  ProjectPublicSurfaceHealthSnapshot,
  ProjectPublicSurfaceHealthStatus,
  ProjectPublicSurfaceHealthSurface,
  ProjectPublicSurfaceScreenshotState,
} from "@/features/projects/public-surface-health";

const surfaceLabels: Record<ProjectPublicSurfaceHealthSurface, string> = {
  "api-payload": "API",
  "app-package": "App package",
  embed: "Embed",
  "public-viewer": "Viewer",
};

function statusVariant(status: ProjectPublicSurfaceHealthStatus) {
  if (status === "fail") {
    return "destructive";
  }

  if (status === "warn") {
    return "secondary";
  }

  return "outline";
}

function statusIcon(status: ProjectPublicSurfaceHealthStatus) {
  if (status === "pass") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return <TriangleAlert className="size-3.5" />;
}

function screenshotLabel(state: ProjectPublicSurfaceScreenshotState) {
  switch (state) {
    case "captured":
      return "Captured";
    case "not-applicable":
      return "Status only";
    case "pending":
      return "Pending capture";
    case "unavailable":
      return "Unavailable";
  }
}

function formatBytes(value: number | null) {
  if (!value) {
    return "No image";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  return `${Math.round(value / 1024)} KB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function SurfaceIcon({ surface }: { surface: ProjectPublicSurfaceHealthSurface }) {
  if (surface === "app-package") {
    return <PackageCheck className="size-4" />;
  }

  if (surface === "api-payload") {
    return <Activity className="size-4" />;
  }

  return <Globe2 className="size-4" />;
}

function SnapshotRow({ snapshot }: { snapshot: ProjectPublicSurfaceHealthSnapshot }) {
  return (
    <TableRow>
      <TableCell>
        <div className="min-w-0">
          <p className="truncate font-medium">{snapshot.projectName}</p>
          <p className="truncate text-xs text-muted-foreground">{snapshot.label}</p>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant="outline">
          <SurfaceIcon surface={snapshot.surface} />
          {surfaceLabels[snapshot.surface]}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(snapshot.status)}>
          {statusIcon(snapshot.status)}
          {snapshot.status}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={snapshot.screenshotState === "pending" ? "secondary" : "outline"}>
          <Camera className="size-3.5" />
          {screenshotLabel(snapshot.screenshotState)}
        </Badge>
        {snapshot.screenshotDiffSummary ? (
          <p className="mt-1 line-clamp-2 max-w-[220px] text-xs text-muted-foreground">{snapshot.screenshotDiffSummary}</p>
        ) : null}
      </TableCell>
      <TableCell>
        <div className="max-w-[300px]">
          <p className="truncate text-xs">{snapshot.url ?? snapshot.path ?? "No public target"}</p>
          {snapshot.screenshotPath ? (
            <p className="truncate text-xs text-muted-foreground">
              {snapshot.screenshotWidth}x{snapshot.screenshotHeight} - {formatBytes(snapshot.screenshotByteSize)}
            </p>
          ) : null}
          {snapshot.issues[0] ? <p className="line-clamp-2 text-xs text-muted-foreground">{snapshot.issues[0]}</p> : null}
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{formatDate(snapshot.checkedAt)}</TableCell>
    </TableRow>
  );
}

export function ProjectPublicSurfaceHealthPanel({
  error,
  report,
}: {
  error?: string | null;
  report: ProjectPublicSurfaceHealthReport;
}) {
  const visibleSnapshots = report.snapshots.slice(0, 10);

  return (
    <Card className="mt-4">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-4" />
              Public surface health
            </CardTitle>
            <CardDescription>Snapshot history for viewer, embed, API, and app package surfaces derived from the current export lineage.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md" variant="outline">
              {report.summary.passCount}/{report.summary.totalCount} passing
            </Badge>
            <Badge className="rounded-md" variant={report.summary.failCount > 0 ? "destructive" : "outline"}>
              {report.summary.failCount} failing
            </Badge>
            <Badge className="rounded-md" variant="secondary">
              {report.history.batchCount} batches
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error ? <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{error}</div> : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Viewer and embed screenshots</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.screenshotCapturedCount} captured</p>
            <p className="mt-1 text-xs text-muted-foreground">{report.summary.screenshotPendingCount} pending</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">API snapshots</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.apiPayloadCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">App package targets</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.appPackageCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Screenshot diffs</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.screenshotDiffCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">{report.history.snapshotCount} history rows</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_260px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Target</TableHead>
                <TableHead>Surface</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Screenshot</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Checked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleSnapshots.length > 0 ? (
                visibleSnapshots.map((snapshot) => <SnapshotRow key={snapshot.sourceKey} snapshot={snapshot} />)
              ) : (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={6}>
                    No public surface snapshots are available yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="rounded-md border bg-background p-3">
            <p className="text-sm font-medium">Recent batches</p>
            <div className="mt-3 grid gap-2">
              {report.history.recentBatches.length > 0 ? (
                report.history.recentBatches.map((batch) => (
                  <div className="rounded-md border bg-muted/20 p-2" key={batch.batchId}>
                    <p className="truncate text-xs font-medium">{batch.batchId}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {batch.passCount} pass, {batch.warnCount} warn, {batch.failCount} fail
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">History starts after the first recorded batch.</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
