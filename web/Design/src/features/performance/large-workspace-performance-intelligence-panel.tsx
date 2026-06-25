"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  Gauge,
  HardDrive,
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
  LargeWorkspaceDocumentBudget,
  LargeWorkspacePerformanceIntelligenceCenter,
  LargeWorkspacePerformanceStatus,
  LargeWorkspaceRecoveryRecommendation,
  LargeWorkspaceSlowSurfaceDiagnostic,
} from "@/features/performance/large-workspace-performance-intelligence";
import { cn } from "@/lib/utils";

type LargeWorkspacePerformanceIntelligencePanelProps = {
  center: LargeWorkspacePerformanceIntelligenceCenter;
};

const statusLabels: Record<LargeWorkspacePerformanceStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  LargeWorkspacePerformanceStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function LargeWorkspacePerformanceIntelligencePanel({
  center,
}: LargeWorkspacePerformanceIntelligencePanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Large-workspace performance intelligence
            </CardTitle>
            <CardDescription>
              Document size budgets, slow-surface diagnostics, recovery
              recommendations, and production telemetry packets.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <a
                download={center.telemetryPacket.fileName}
                href={center.telemetryPacket.dataUrl}
              >
                <Download className="h-4 w-4" />
                Packet
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Projects" value={center.totals.projects} />
          <Metric label="Budgets" value={center.totals.documentBudgets} />
          <Metric
            label="Diagnostics"
            value={center.totals.slowSurfaceDiagnostics}
          />
          <Metric
            label="Recovery"
            value={center.totals.recoveryRecommendations}
          />
          <Metric label="Blocked" value={center.totals.blockedProjects} />
          <Metric
            label="Assets"
            value={formatBytes(center.totals.totalAssetBytes)}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-3">
            {center.documentBudgets.length ? (
              center.documentBudgets
                .slice(0, 6)
                .map((budget) => (
                  <DocumentBudgetCard key={budget.id} budget={budget} />
                ))
            ) : (
              <EmptyLine>
                Create a project before performance budgets can be scored.
              </EmptyLine>
            )}
          </section>

          <div className="space-y-4">
            <DiagnosticsPanel diagnostics={center.slowSurfaceDiagnostics} />
            <RecoveryPanel recommendations={center.recoveryRecommendations} />
          </div>
        </div>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Performance next actions
            </div>
            <div className="mt-2 grid gap-2">
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
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DocumentBudgetCard({
  budget,
}: {
  budget: LargeWorkspaceDocumentBudget;
}) {
  return (
    <article className="rounded-md border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusIcon status={budget.status} />
            <h3 className="truncate text-sm font-semibold">
              {budget.projectName}
            </h3>
            <Badge variant={statusVariants[budget.status]}>
              {budget.score}/100
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{budget.detail}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-5">
        <MiniStat label="Canvas" value={formatNumber(budget.canvasPixels)} />
        <MiniStat label="Assets" value={formatBytes(budget.assetBytes)} />
        <MiniStat label="Refs" value={budget.assetReferenceCount} />
        <MiniStat label="Versions" value={budget.versionCount} />
        <MiniStat
          label="Exports"
          value={formatBytes(budget.exportArtifactBytes)}
        />
      </div>
    </article>
  );
}

function DiagnosticsPanel({
  diagnostics,
}: {
  diagnostics: LargeWorkspaceSlowSurfaceDiagnostic[];
}) {
  return (
    <PanelBlock
      title="Slow-surface diagnostics"
      badge={`${diagnostics.length} diagnostics`}
      icon={<Activity className="h-4 w-4 text-muted-foreground" />}
    >
      {diagnostics.length ? (
        <ScrollArea className="h-[320px]">
          <div className="space-y-2 pr-3">
            {diagnostics.map((diagnostic) => (
              <div
                key={diagnostic.id}
                className="rounded-md border border-border bg-background p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {diagnostic.projectName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {diagnostic.surface} / {diagnostic.metricLabel}
                    </p>
                  </div>
                  <StatusIcon status={diagnostic.status} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {diagnostic.detail}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <EmptyLine>No slow workspace surfaces are currently flagged.</EmptyLine>
      )}
    </PanelBlock>
  );
}

function RecoveryPanel({
  recommendations,
}: {
  recommendations: LargeWorkspaceRecoveryRecommendation[];
}) {
  return (
    <PanelBlock
      title="Recovery recommendations"
      badge={`${recommendations.length} actions`}
      icon={<RefreshCcw className="h-4 w-4 text-muted-foreground" />}
    >
      {recommendations.length ? (
        <ScrollArea className="h-[320px]">
          <div className="space-y-2 pr-3">
            {recommendations.map((recommendation) => (
              <div
                key={recommendation.id}
                className="rounded-md border border-border bg-background p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      {recommendation.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {recommendation.projectName}
                    </p>
                  </div>
                  <Badge variant={statusVariants[recommendation.status]}>
                    {statusLabels[recommendation.status]}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {recommendation.steps[0] ?? recommendation.impact}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <EmptyLine>Workspace performance budgets are within limits.</EmptyLine>
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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </h3>
        <Badge variant="outline">{badge}</Badge>
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-[11px] uppercase text-muted-foreground">
        <HardDrive className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
      {children}
    </p>
  );
}

function StatusIcon({ status }: { status: LargeWorkspacePerformanceStatus }) {
  const className = cn("h-4 w-4", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "blocked") return <XCircle className={className} />;

  return <AlertTriangle className={className} />;
}

function formatNumber(value: number) {
  return value.toLocaleString("en");
}

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let value = Math.max(0, bytes);
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}
