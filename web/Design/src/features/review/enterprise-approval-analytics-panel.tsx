"use client";

import {
  Activity,
  CheckCircle2,
  CircleAlert,
  Download,
  Gauge,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  EnterpriseApprovalAnalyticsCenter,
  EnterpriseApprovalAnalyticsStatus,
  EnterpriseApprovalAnalyticsWorkspace,
  EnterpriseApprovalBottleneck,
  EnterpriseApprovalReviewerForecast,
  EnterpriseApprovalTrendBaseline,
} from "@/features/review/enterprise-approval-analytics";
import { cn } from "@/lib/utils";

type EnterpriseApprovalAnalyticsPanelProps = {
  center: EnterpriseApprovalAnalyticsCenter;
};

const statusLabels: Record<EnterpriseApprovalAnalyticsStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  EnterpriseApprovalAnalyticsStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function EnterpriseApprovalAnalyticsPanel({
  center,
}: EnterpriseApprovalAnalyticsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Cross-workspace approval analytics
            </CardTitle>
            <CardDescription>
              Trend baselines, bottlenecks, reviewer load forecasts, and
              executive governance packets across managed workspaces.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          <Metric label="Workspaces" value={center.totals.workspaces} />
          <Metric label="Pending" value={center.totals.pendingSubjects} />
          <Metric label="Current" value={center.totals.currentApprovalEvents} />
          <Metric
            label="Baseline"
            value={center.totals.previousApprovalEvents}
          />
          <Metric label="Bottlenecks" value={center.totals.bottlenecks} />
          <Metric label="Blocked" value={center.totals.blockedWorkspaces} />
          <Metric label="Forecasts" value={center.totals.reviewerForecasts} />
          <Metric label="Overdue" value={center.totals.overdueReviewTasks} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-4">
            <WorkspaceAnalytics workspaces={center.workspaceAnalytics} />
            <ReviewerForecasts forecasts={center.reviewerForecasts} />
          </section>
          <section className="space-y-4">
            <TrendBaselines trends={center.trendBaselines} />
            <Bottlenecks bottlenecks={center.bottlenecks} />
            <ExecutivePacket center={center} />
          </section>
        </div>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CircleAlert className="h-4 w-4 text-muted-foreground" />
              Next analytics actions
            </div>
            <div className="mt-2 grid gap-2">
              {center.nextActions.map((action) => (
                <p key={action} className="text-xs text-muted-foreground">
                  {action}
                </p>
              ))}
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function WorkspaceAnalytics({
  workspaces,
}: {
  workspaces: EnterpriseApprovalAnalyticsWorkspace[];
}) {
  return (
    <PanelBlock
      title="Workspace analytics"
      badge={`${workspaces.length} workspaces`}
    >
      {workspaces.map((workspace) => (
        <div
          key={workspace.workspaceId}
          className="rounded-md border border-border bg-muted/20 p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <StatusIcon status={workspace.status} />
                <p className="truncate text-sm font-semibold">
                  {workspace.workspaceName}
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {workspace.role} / {workspace.trend.detail}
              </p>
            </div>
            <Badge variant={statusVariants[workspace.status]}>
              {workspace.score}/100
            </Badge>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <Metric label="Pending" value={workspace.pendingSubjects} compact />
            <Metric
              label="Changes"
              value={workspace.changesRequestedSubjects}
              compact
            />
            <Metric label="Overdue" value={workspace.overdueReviewTasks} compact />
            <Metric label="Forecasts" value={workspace.reviewerForecasts} compact />
          </div>
        </div>
      ))}
    </PanelBlock>
  );
}

function TrendBaselines({
  trends,
}: {
  trends: EnterpriseApprovalTrendBaseline[];
}) {
  return (
    <PanelBlock title="Trend baselines" badge={`${trends.length} trends`}>
      {trends.map((trend) => (
        <div
          key={trend.id}
          className="rounded-md border border-border bg-muted/20 p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <TrendIcon trend={trend} />
                <p className="truncate text-sm font-medium">
                  {trend.workspaceName}
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {trend.detail}
              </p>
            </div>
            <Badge variant={statusVariants[trend.status]}>
              {trend.direction}
            </Badge>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <Metric label="Current" value={trend.currentApprovalEvents} compact />
            <Metric
              label="Previous"
              value={trend.previousApprovalEvents}
              compact
            />
            <Metric label="Delta" value={trend.delta} compact />
          </div>
        </div>
      ))}
    </PanelBlock>
  );
}

function Bottlenecks({
  bottlenecks,
}: {
  bottlenecks: EnterpriseApprovalBottleneck[];
}) {
  return (
    <PanelBlock title="Bottlenecks" badge={`${bottlenecks.length} found`}>
      {bottlenecks.length ? (
        bottlenecks.map((bottleneck) => (
          <div
            key={bottleneck.id}
            className="rounded-md border border-border bg-muted/20 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <StatusIcon status={bottleneck.status} />
                  <p className="truncate text-sm font-medium">
                    {bottleneck.stage}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {bottleneck.workspaceName} / {bottleneck.ownerLabel}
                </p>
              </div>
              <Badge variant={statusVariants[bottleneck.status]}>
                {bottleneck.count}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {bottleneck.detail}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {bottleneck.subjectNames.slice(0, 3).map((subject) => (
                <Badge key={subject} variant="outline">
                  {subject}
                </Badge>
              ))}
            </div>
          </div>
        ))
      ) : (
        <EmptyState text="No approval bottlenecks are active across workspaces." />
      )}
    </PanelBlock>
  );
}

function ReviewerForecasts({
  forecasts,
}: {
  forecasts: EnterpriseApprovalReviewerForecast[];
}) {
  return (
    <PanelBlock
      title="Reviewer load forecast"
      badge={`${forecasts.length} reviewers`}
    >
      {forecasts.length ? (
        forecasts.map((forecast) => (
          <div
            key={forecast.id}
            className="rounded-md border border-border bg-muted/20 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <UsersRound className="h-4 w-4 text-muted-foreground" />
                  <p className="truncate text-sm font-medium">
                    {forecast.reviewerName}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {forecast.workspaceName} / {forecast.capacityRisk} risk
                </p>
              </div>
              <Badge variant={statusVariants[forecast.status]}>
                {forecast.forecastNext7Days} next
              </Badge>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              <Metric label="Open" value={forecast.openTasks} compact />
              <Metric label="Overdue" value={forecast.overdueTasks} compact />
              <Metric label="Due soon" value={forecast.dueSoonTasks} compact />
              <Metric label="Score" value={forecast.loadScore} compact />
            </div>
          </div>
        ))
      ) : (
        <EmptyState text="No open reviewer load is forecasted right now." />
      )}
    </PanelBlock>
  );
}

function ExecutivePacket({
  center,
}: {
  center: EnterpriseApprovalAnalyticsCenter;
}) {
  return (
    <PanelBlock title="Executive packet" badge={statusLabels[center.status]}>
      <div className="rounded-md border border-border bg-muted/20 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <p className="truncate text-sm font-medium">
                Cross-workspace approval analytics
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {center.executivePacket.workspaceIds.length} workspaces /{" "}
              {center.totals.bottlenecks} bottlenecks /{" "}
              {center.totals.reviewerForecasts} reviewer forecasts.
            </p>
          </div>
          <Badge variant={statusVariants[center.executivePacket.status]}>
            {statusLabels[center.executivePacket.status]}
          </Badge>
        </div>
        <Button asChild size="sm" variant="outline" className="mt-3">
          <a
            href={center.executivePacket.download.href}
            download={center.executivePacket.download.fileName}
          >
            <Download className="h-4 w-4" />
            Packet
          </a>
        </Button>
      </div>
    </PanelBlock>
  );
}

function PanelBlock({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {badge ? <Badge variant="outline">{badge}</Badge> : null}
      </div>
      <div className="mt-3 grid gap-2">{children}</div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
      {text}
    </p>
  );
}

function Metric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: number | string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-semibold", compact ? "text-sm" : "text-lg")}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function TrendIcon({ trend }: { trend: EnterpriseApprovalTrendBaseline }) {
  const className = "h-4 w-4 text-muted-foreground";

  if (trend.direction === "up") return <TrendingUp className={className} />;
  if (trend.direction === "down") return <TrendingDown className={className} />;

  return <Activity className={className} />;
}

function StatusIcon({ status }: { status: EnterpriseApprovalAnalyticsStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "blocked") return <ShieldAlert className={className} />;

  return <CircleAlert className={className} />;
}
