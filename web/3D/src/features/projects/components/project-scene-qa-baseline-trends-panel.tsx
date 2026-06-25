import { Activity, AlertTriangle, GitCompareArrows, History, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SceneQaBaselineDeploymentTrend, SceneQaBaselineDrift, SceneQaBaselineTrendReport } from "@/features/projects/scene-qa-baseline-trends";
import type { SceneQaSnapshotStatus, SceneQaSnapshotSurface } from "@/features/projects/scene-qa-snapshots";

const surfaceLabels: Record<SceneQaSnapshotSurface, string> = {
  "api-payload": "API",
  embed: "Embed",
  "public-viewer": "Viewer",
  "template-launch": "Template",
};

function formatDate(value: string) {
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

function statusVariant(status: SceneQaSnapshotStatus) {
  if (status === "fail") {
    return "destructive";
  }

  return status === "warn" ? "secondary" : "outline";
}

function deploymentVariant(trend: SceneQaBaselineDeploymentTrend) {
  if (trend.failedCount > 0) {
    return "destructive";
  }

  return trend.driftedCount > 0 || trend.warningCount > 0 ? "secondary" : "outline";
}

function driftLabel(drift: SceneQaBaselineDrift) {
  if (drift.type === "new") {
    return "New surface";
  }

  if (drift.type === "removed") {
    return "Removed surface";
  }

  if (drift.type === "signature") {
    return "Signature drift";
  }

  return `${drift.fromStatus ?? "new"} -> ${drift.toStatus}`;
}

function DriftList({ trend }: { trend: SceneQaBaselineDeploymentTrend }) {
  if (trend.topDrifts.length === 0) {
    return <span className="text-sm text-muted-foreground">No drift from the previous deployment baseline.</span>;
  }

  return (
    <div className="grid gap-1">
      {trend.topDrifts.map((drift) => (
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm" key={`${trend.deploymentId}:${drift.comparisonId}:${drift.type}`}>
          <Badge className="rounded-md" variant="outline">
            {surfaceLabels[drift.surface]}
          </Badge>
          <span className="truncate font-medium">{drift.targetName}</span>
          <span className="text-muted-foreground">{driftLabel(drift)}</span>
        </div>
      ))}
    </div>
  );
}

function TrendRow({ trend }: { trend: SceneQaBaselineDeploymentTrend }) {
  return (
    <TableRow>
      <TableCell>
        <div className="min-w-0">
          <p className="truncate font-medium">{trend.deploymentId}</p>
          <p className="text-xs text-muted-foreground">{formatDate(trend.capturedAt)}</p>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant={deploymentVariant(trend)}>
          {trend.failedCount > 0 ? `${trend.failedCount} failed` : `${trend.driftedCount} drifted`}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          <Badge className="rounded-md" variant={statusVariant("pass")}>
            {trend.passedCount} pass
          </Badge>
          <Badge className="rounded-md" variant={statusVariant("warn")}>
            {trend.warningCount} warn
          </Badge>
          <Badge className="rounded-md" variant={statusVariant("fail")}>
            {trend.failedCount} fail
          </Badge>
        </div>
      </TableCell>
      <TableCell className="max-w-[520px] whitespace-normal">
        <DriftList trend={trend} />
      </TableCell>
    </TableRow>
  );
}

export function ProjectSceneQaBaselineTrendsPanel({
  error,
  report,
}: {
  error?: string | null;
  report: SceneQaBaselineTrendReport | null;
}) {
  const latest = report?.latestTrend ?? null;
  const visibleDeployments = report?.deployments.slice(0, 6) ?? [];

  return (
    <Card className="mt-4">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="size-4" />
              Scene QA baseline trends
            </CardTitle>
            <CardDescription>Workspace baselines are persisted by deployment so public surfaces can be compared before releases drift.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={error ? "destructive" : "outline"}>
              {error ? <AlertTriangle className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
              {error ? "Not persisted" : `${report?.summary.deploymentCount ?? 0} deployments`}
            </Badge>
            <Badge className="gap-1 rounded-md" variant={latest && latest.driftedCount > 0 ? "secondary" : "outline"}>
              <GitCompareArrows className="size-3.5" />
              {report?.summary.latestDriftedCount ?? 0} latest drift
            </Badge>
            <Badge className="gap-1 rounded-md" variant={latest && latest.failedCount > 0 ? "destructive" : "outline"}>
              <Activity className="size-3.5" />
              {report?.summary.latestFailedCount ?? 0} latest failed
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error ? <p className="mb-4 text-sm text-muted-foreground">{error}</p> : null}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deployment</TableHead>
              <TableHead>Drift</TableHead>
              <TableHead>Status mix</TableHead>
              <TableHead>Notable changes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleDeployments.length > 0 ? (
              visibleDeployments.map((trend) => <TrendRow key={trend.deploymentId} trend={trend} />)
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={4}>
                  No workspace scene QA deployment baselines have been recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
