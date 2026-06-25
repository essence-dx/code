import { AlertTriangle, Camera, CheckCircle2, Code2, FileJson, MonitorPlay, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SceneQaSnapshotComparison, SceneQaSnapshotReport, SceneQaSnapshotStatus, SceneQaSnapshotSurface } from "@/features/projects/scene-qa-snapshots";

const surfaceLabels: Record<SceneQaSnapshotSurface, string> = {
  "api-payload": "API payload",
  embed: "Embed",
  "public-viewer": "Viewer",
  "template-launch": "Template",
};

function iconForSurface(surface: SceneQaSnapshotSurface) {
  switch (surface) {
    case "api-payload":
      return <FileJson className="size-4" />;
    case "embed":
      return <Code2 className="size-4" />;
    case "public-viewer":
      return <MonitorPlay className="size-4" />;
    case "template-launch":
      return <Sparkles className="size-4" />;
  }
}

function statusVariant(status: SceneQaSnapshotStatus) {
  if (status === "fail") {
    return "destructive";
  }

  return status === "warn" ? "secondary" : "outline";
}

function statusIcon(status: SceneQaSnapshotStatus) {
  return status === "pass" ? <CheckCircle2 className="size-4 text-emerald-500" /> : <AlertTriangle className="size-4 text-amber-500" />;
}

function formatDate(value: string | null) {
  if (!value) {
    return "No timestamp";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function ComparisonRow({ comparison }: { comparison: SceneQaSnapshotComparison }) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">{iconForSurface(comparison.surface)}</span>
          <div className="min-w-0">
            <p className="truncate font-medium">{comparison.targetName}</p>
            <p className="truncate text-xs text-muted-foreground">{comparison.path ?? surfaceLabels[comparison.surface]}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant="outline">
          {surfaceLabels[comparison.surface]}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(comparison.status)}>
          {statusIcon(comparison.status)}
          {comparison.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[420px] whitespace-normal">
        {comparison.issues.length > 0 ? (
          <span className="text-sm text-muted-foreground">{comparison.issues.join(" ")}</span>
        ) : (
          <span className="text-sm text-muted-foreground">Snapshot matches the scene baseline.</span>
        )}
      </TableCell>
      <TableCell>{formatDate(comparison.updatedAt)}</TableCell>
    </TableRow>
  );
}

export function ProjectSceneQaSnapshotPanel({ report }: { report: SceneQaSnapshotReport }) {
  const visibleComparisons = report.comparisons.slice(0, 10);

  return (
    <Card className="mt-4">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Camera className="size-4" />
              Scene QA snapshots
            </CardTitle>
            <CardDescription>Public viewer, embed, API payload, and template launch comparisons against canonical scene snapshots.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md" variant={report.summary.failedCount > 0 ? "destructive" : "outline"}>
              {report.summary.failedCount} failed
            </Badge>
            <Badge className="rounded-md" variant="secondary">
              {report.summary.warningCount} warnings
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.passedCount} passed
            </Badge>
          </div>
        </div>
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
          <span className="rounded-md bg-muted px-2 py-1">{report.summary.publicViewerCount} viewer snapshots</span>
          <span className="rounded-md bg-muted px-2 py-1">{report.summary.embedCount} embed snapshots</span>
          <span className="rounded-md bg-muted px-2 py-1">{report.summary.apiPayloadCount} API snapshots</span>
          <span className="rounded-md bg-muted px-2 py-1">{report.summary.templateLaunchCount} template snapshots</span>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Target</TableHead>
              <TableHead>Surface</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Comparison</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleComparisons.length > 0 ? (
              visibleComparisons.map((comparison) => <ComparisonRow comparison={comparison} key={comparison.id} />)
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={5}>
                  No published scenes or template launch snapshots are available in this workspace.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {report.comparisons.length > visibleComparisons.length ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Showing {visibleComparisons.length} of {report.comparisons.length} snapshot comparisons.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
