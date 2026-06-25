import type { ReactNode } from "react";
import { Activity, CheckCircle2, CircleAlert, FileWarning, MessageCircle, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ProjectDashboardAnalytics, ProjectHealthSummary } from "../project-dashboard-analytics";

function formatPercent(value: number) {
  return `${Math.max(0, Math.min(100, value))}%`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "No activity";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function healthVariant(status: ProjectHealthSummary["status"]) {
  if (status === "healthy") {
    return "default";
  }

  return status === "blocked" ? "destructive" : "secondary";
}

function AnalyticsMetric({
  detail,
  icon,
  label,
  value,
}: {
  detail: string;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">{icon}</div>
      </CardContent>
    </Card>
  );
}

function ReadinessRow({ label, ready, total }: { label: string; ready: number; total: number }) {
  const percent = total > 0 ? Math.round((ready / total) * 100) : 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium uppercase">{label}</span>
        <span className="text-xs text-muted-foreground">
          {ready}/{total} ready
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", percent === 100 ? "bg-emerald-500" : percent >= 50 ? "bg-amber-500" : "bg-destructive")} style={{ width: formatPercent(percent) }} />
      </div>
    </div>
  );
}

function AttentionProject({ project }: { project: ProjectHealthSummary }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{project.name}</p>
            <Badge className="rounded-md text-[10px]" variant={healthVariant(project.status)}>
              {project.score}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Updated {formatDate(project.updatedAt)}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {project.openCommentCount > 0 ? <Badge variant="secondary">{project.openCommentCount} open comments</Badge> : null}
        {project.blockerCount > 0 ? <Badge variant="secondary">{project.blockerCount} review gates</Badge> : null}
        {project.exportIssueCount > 0 ? <Badge variant="secondary">{project.exportIssueCount} export issues</Badge> : null}
      </div>
    </div>
  );
}

export function ProjectDashboardAnalyticsPanel({ analytics }: { analytics: ProjectDashboardAnalytics }) {
  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetric
          detail={`${analytics.activity.updatedLast7Days} updated this week`}
          icon={<Activity className="size-4" />}
          label="Workspace health"
          value={formatPercent(analytics.activity.averageHealthScore)}
        />
        <AnalyticsMetric
          detail={`${analytics.comments.openCommentCount} open across ${analytics.comments.projectCountWithOpenComments} projects`}
          icon={<MessageCircle className="size-4" />}
          label="Comment closure"
          value={formatPercent(analytics.comments.closureRate)}
        />
        <AnalyticsMetric
          detail={`${analytics.exports.projectCountWithExportIssues} projects need export review`}
          icon={<FileWarning className="size-4" />}
          label="Export readiness"
          value={`${analytics.exports.formatReadiness.reduce((sum, item) => sum + item.readyCount, 0)}/${analytics.exports.formatReadiness.reduce((sum, item) => sum + item.totalCount, 0)}`}
        />
        <AnalyticsMetric
          detail={`${analytics.release.blockerCount} review blockers`}
          icon={<Rocket className="size-4" />}
          label="Release ready"
          value={`${analytics.release.readyProjectCount}/${analytics.activity.activeProjectCount}`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Operational analytics</CardTitle>
            <CardDescription>Project health, export readiness, comments, and release gates.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              {analytics.exports.formatReadiness.map((item) => (
                <ReadinessRow key={item.format} label={item.format} ready={item.readyCount} total={item.totalCount} />
              ))}
              {analytics.exports.invalidSceneCount > 0 ? (
                <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-2 text-xs text-destructive">
                  <CircleAlert className="size-4" />
                  {analytics.exports.invalidSceneCount} invalid scene document{analytics.exports.invalidSceneCount === 1 ? "" : "s"}
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Badge className="justify-center rounded-md" variant="default">
                  {analytics.health.healthyCount} healthy
                </Badge>
                <Badge className="justify-center rounded-md" variant="secondary">
                  {analytics.health.reviewCount} review
                </Badge>
                <Badge className="justify-center rounded-md" variant={analytics.health.blockedCount > 0 ? "destructive" : "outline"}>
                  {analytics.health.blockedCount} blocked
                </Badge>
              </div>
              <Separator />
              {analytics.release.surfaceBlockers.length > 0 ? (
                <div className="space-y-2">
                  {analytics.release.surfaceBlockers.map((blocker) => (
                    <div key={blocker.surface} className="flex items-center justify-between gap-3 rounded-md border border-border p-2 text-sm">
                      <span>{blocker.surface}</span>
                      <Badge className="rounded-md" variant="secondary">
                        {blocker.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-md border border-border p-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  Release gates are clear.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
            <CardDescription>Lowest health or active review work.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {analytics.health.projectsNeedingAttention.length > 0 ? (
              analytics.health.projectsNeedingAttention.map((project) => <AttentionProject key={project.id} project={project} />)
            ) : (
              <div className="flex items-center gap-2 rounded-md border border-border p-3 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 text-emerald-500" />
                No project attention queue.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
