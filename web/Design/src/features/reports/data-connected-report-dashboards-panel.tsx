"use client";

import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Download,
  FileText,
  RefreshCcw,
  XCircle,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  DataConnectedReportChartBlock,
  DataConnectedReportDashboard,
  DataConnectedReportDashboardCenter,
  DataConnectedReportRefreshPlan,
  DataConnectedReportStaleWarning,
  DataConnectedReportStatus,
} from "@/features/reports/data-connected-report-dashboards";
import { cn } from "@/lib/utils";

type DataConnectedReportDashboardsPanelProps = {
  center: DataConnectedReportDashboardCenter;
};

const statusLabels: Record<DataConnectedReportStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  DataConnectedReportStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function DataConnectedReportDashboardsPanel({
  center,
}: DataConnectedReportDashboardsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Data-connected report dashboards
            </CardTitle>
            <CardDescription>
              Reusable chart blocks, refresh plans, stale-source warnings, and
              executive packets for data-backed stakeholder reporting.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <a
                href={center.executivePacket.dataUrl}
                download={center.executivePacket.fileName}
              >
                <Download className="h-4 w-4" />
                Packet
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-5">
          <Metric label="Dashboards" value={center.totals.dashboards} />
          <Metric label="Chart blocks" value={center.totals.chartBlocks} />
          <Metric label="Refresh plans" value={center.totals.refreshPlans} />
          <Metric label="Warnings" value={center.totals.staleWarnings} />
          <Metric
            label="Export ready"
            value={center.totals.exportReadyDashboards}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_410px]">
          <section className="space-y-3">
            {center.dashboards.map((dashboard) => (
              <DashboardCard
                key={dashboard.id}
                dashboard={dashboard}
                chartBlocks={center.chartBlocks}
              />
            ))}
          </section>

          <div className="space-y-4">
            <RefreshPlansPanel plans={center.refreshPlans} />
            <StaleWarningsPanel warnings={center.staleSourceWarnings} />
          </div>
        </div>

        {center.nextActions.length ? (
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Next report actions
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {center.nextActions.map((action) => (
                <p
                  key={action}
                  className="flex gap-2 text-xs text-muted-foreground"
                >
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{action}</span>
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DashboardCard({
  dashboard,
  chartBlocks,
}: {
  dashboard: DataConnectedReportDashboard;
  chartBlocks: DataConnectedReportChartBlock[];
}) {
  const blocks = dashboard.blockIds
    .map((blockId) => chartBlocks.find((block) => block.id === blockId))
    .filter((block): block is DataConnectedReportChartBlock => Boolean(block));

  return (
    <article className="rounded-md border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusIcon status={dashboard.status} />
            <h3 className="truncate text-sm font-semibold">
              {dashboard.title}
            </h3>
            <Badge variant={statusVariants[dashboard.status]}>
              {dashboard.score}/100
            </Badge>
            <Badge variant="outline">{dashboard.audience}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {dashboard.summary}
          </p>
        </div>
        <Badge variant={dashboard.exportReady ? "secondary" : "outline"}>
          {dashboard.exportReady ? "Export ready" : "Review"}
        </Badge>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {blocks.map((block) => (
          <ChartBlockLine key={block.id} block={block} />
        ))}
      </div>
    </article>
  );
}

function ChartBlockLine({ block }: { block: DataConnectedReportChartBlock }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <p className="truncate text-xs font-semibold">{block.title}</p>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {block.summary}
          </p>
        </div>
        <Badge variant={statusVariants[block.status]}>
          {block.chartType.toUpperCase()}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">{block.sourceLabel}</Badge>
        <Badge variant="outline">{block.dataPoints.length} points</Badge>
      </div>
    </div>
  );
}

function RefreshPlansPanel({
  plans,
}: {
  plans: DataConnectedReportRefreshPlan[];
}) {
  return (
    <PanelBlock
      title="Refresh plans"
      badge={`${plans.length} sources`}
      icon={<RefreshCcw className="h-4 w-4 text-muted-foreground" />}
    >
      <div className="grid gap-2">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "rounded-md border border-border p-3",
              plan.status === "ready" ? "bg-background" : "bg-muted/20",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {plan.sourceLabel}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {plan.detail}
                </p>
              </div>
              <StatusIcon status={plan.status} />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <MiniStat label="Cadence" value={`${plan.cadenceHours}h`} />
              <MiniStat
                label="Next"
                value={plan.nextRefreshAt?.slice(0, 10) ?? "Needed"}
              />
            </div>
          </div>
        ))}
      </div>
    </PanelBlock>
  );
}

function StaleWarningsPanel({
  warnings,
}: {
  warnings: DataConnectedReportStaleWarning[];
}) {
  return (
    <PanelBlock
      title="Stale-source warnings"
      badge={`${warnings.length} warnings`}
      icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
    >
      {warnings.length ? (
        <ScrollArea className="h-64">
          <div className="space-y-2 pr-3">
            {warnings.map((warning) => (
              <div
                key={warning.id}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{warning.sourceLabel}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {warning.detail}
                    </p>
                  </div>
                  <Badge variant={statusVariants[warning.severity]}>
                    {warning.ageHours}h
                  </Badge>
                </div>
                <p className="mt-2 text-xs font-medium">
                  {warning.remediation}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <p className="text-sm text-muted-foreground">
          All report sources are fresh enough for executive export.
        </p>
      )}
    </PanelBlock>
  );
}

function PanelBlock({
  title,
  badge,
  icon,
  children,
}: {
  title: string;
  badge: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </div>
        <Badge variant="outline">{badge}</Badge>
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function StatusIcon({ status }: { status: DataConnectedReportStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  }

  if (status === "blocked") {
    return <XCircle className="h-4 w-4 text-destructive" />;
  }

  return <AlertTriangle className="h-4 w-4 text-amber-500" />;
}
