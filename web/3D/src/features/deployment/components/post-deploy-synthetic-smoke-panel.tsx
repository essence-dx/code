import { Activity, AlertTriangle, CheckCircle2, ExternalLink, Radar } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PostDeploySyntheticDashboardStatus, PostDeploySyntheticDashboardSummary, PostDeploySyntheticCheckRow } from "../post-deploy-synthetic-dashboard";

function statusVariant(status: PostDeploySyntheticDashboardStatus) {
  if (status === "fail") {
    return "destructive";
  }

  return status === "pass" ? "default" : "secondary";
}

function statusIcon(status: PostDeploySyntheticDashboardStatus) {
  if (status === "pass") {
    return <CheckCircle2 className="size-4 text-emerald-500" />;
  }

  return status === "fail" ? <AlertTriangle className="size-4 text-destructive" /> : <Activity className="size-4 text-muted-foreground" />;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function CheckRow({ check }: { check: PostDeploySyntheticCheckRow }) {
  return (
    <div className="grid gap-2 rounded-md border border-border p-3 lg:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {statusIcon(check.status)}
          <p className="truncate text-sm font-medium">{check.label}</p>
          <Badge className="rounded-md text-[10px]" variant={statusVariant(check.status)}>
            {check.status}
          </Badge>
          <Badge className="rounded-md text-[10px]" variant="outline">
            {check.httpStatus ?? "no response"}
          </Badge>
        </div>
        <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{check.url}</p>
        {check.issues.length > 0 ? <p className="mt-2 text-sm text-muted-foreground">{check.issues.join(" ")}</p> : null}
      </div>
      <Badge className="h-fit w-fit rounded-md lg:justify-self-end" variant="outline">
        {check.durationMs}ms
      </Badge>
    </div>
  );
}

export function PostDeploySyntheticSmokePanel({ summary }: { summary: PostDeploySyntheticDashboardSummary }) {
  const visibleChecks = summary.issueRows.length > 0 ? summary.issueRows : summary.checkRows.slice(0, 4);

  return (
    <Card className="mt-4">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Radar className="size-4" />
              Post-deploy smoke
            </CardTitle>
            <CardDescription>Public viewer, embed, API helper, and compliance download checks from the latest deploy smoke report.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md" variant={statusVariant(summary.status)}>
              {summary.statusLabel}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {summary.completionPercent}%
            </Badge>
            <Badge className="rounded-md" variant="secondary">
              {summary.currentPassStreak} pass streak
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-md border border-border p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Latest route smoke</p>
                <p className="mt-1 text-3xl font-semibold">{summary.completionPercent}%</p>
              </div>
              <span className="flex size-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                {statusIcon(summary.status)}
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", summary.status === "pass" ? "bg-emerald-500" : summary.status === "fail" ? "bg-destructive" : "bg-muted-foreground")} style={{ width: `${summary.completionPercent}%` }} />
            </div>
            <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between gap-3">
                <span>Last run</span>
                <span className="font-medium text-foreground">{formatDate(summary.generatedAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>History</span>
                <span className="font-medium text-foreground">
                  {summary.passedRunCount}/{summary.totalRunCount} passing
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Target</span>
                <span className="max-w-[220px] truncate font-medium text-foreground">{summary.baseUrl ?? "No target"}</span>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">CLI source</p>
              <code className="overflow-x-auto rounded-md border border-border bg-muted px-3 py-2 text-xs">{summary.actionCommand}</code>
              <Link className={buttonVariants({ className: "w-fit gap-2", size: "sm", variant: "outline" })} href="/projects/release-operations">
                Release Ops
                <ExternalLink className="size-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <TrendMetric label="Latest pass" value={formatDate(summary.latestPassedAt)} />
            <TrendMetric label="Latest failure" value={formatDate(summary.latestFailedAt)} />
            <TrendMetric label="Share id" value={summary.shareId ?? "Not set"} />
            <TrendMetric label="Project id" value={summary.projectId ?? "Not set"} />
          </div>
        </div>

        <div className="space-y-2">
          {visibleChecks.length > 0 ? (
            visibleChecks.map((check) => <CheckRow check={check} key={check.key} />)
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-border p-3 text-sm text-muted-foreground">
              <Activity className="size-4" />
              No post-deploy smoke report has been written yet.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TrendMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}
