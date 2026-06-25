"use client";

import {
  ArrowRight,
  BellRing,
  BriefcaseBusiness,
  CheckCircle2,
  CircleAlert,
  Download,
  FileText,
  ShieldAlert,
  Sparkles,
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
  WorkspaceAnomalyExplanation,
  WorkspaceExecutiveSummary,
  WorkspaceIntelligenceActionPriority,
  WorkspaceIntelligenceBriefingCenter,
  WorkspaceIntelligenceDigestPacket,
  WorkspaceIntelligenceSeverity,
  WorkspaceIntelligenceStatus,
  WorkspaceRecommendedAction,
} from "@/features/workspace-intelligence/workspace-intelligence-briefings";
import { cn } from "@/lib/utils";

type WorkspaceIntelligenceBriefingsPanelProps = {
  center: WorkspaceIntelligenceBriefingCenter;
};

const statusLabels: Record<WorkspaceIntelligenceStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  WorkspaceIntelligenceStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

const severityVariants: Record<
  WorkspaceIntelligenceSeverity,
  "secondary" | "outline" | "destructive"
> = {
  info: "secondary",
  watch: "outline",
  critical: "destructive",
};

const priorityVariants: Record<
  WorkspaceIntelligenceActionPriority,
  "secondary" | "outline" | "destructive"
> = {
  normal: "secondary",
  high: "outline",
  critical: "destructive",
};

export function WorkspaceIntelligenceBriefingsPanel({
  center,
}: WorkspaceIntelligenceBriefingsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BriefcaseBusiness className="h-5 w-5" />
              Workspace intelligence briefings
            </CardTitle>
            <CardDescription>
              Executive summaries, anomaly explanations, recommended actions,
              and scheduled digest packets across the production workspace.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            {center.digestPackets.slice(0, 2).map((packet) => (
              <Button asChild key={packet.id} size="sm" variant="outline">
                <a download={packet.fileName} href={packet.dataUrl}>
                  <Download className="h-4 w-4" />
                  {packet.cadence}
                </a>
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-border bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {center.executiveNarrative}
            </p>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          <Metric label="Summaries" value={center.totals.executiveSummaries} />
          <Metric label="Anomalies" value={center.totals.anomalyExplanations} />
          <Metric label="Critical" value={center.totals.criticalAnomalies} />
          <Metric label="Watch" value={center.totals.watchAnomalies} />
          <Metric label="Actions" value={center.totals.recommendedActions} />
          <Metric label="Packets" value={center.totals.digestPackets} />
          <Metric label="Digest" value={center.totals.unreadDigestItems} />
          <Metric label="Audit" value={center.totals.recentAuditEvents} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
          <section className="space-y-3">
            <PanelBlock
              badge={`${center.executiveSummaries.length} areas`}
              icon={<FileText className="h-4 w-4 text-muted-foreground" />}
              title="Executive summaries"
            >
              {center.executiveSummaries.map((summary) => (
                <ExecutiveSummaryCard key={summary.id} summary={summary} />
              ))}
            </PanelBlock>

            <PanelBlock
              badge={`${center.anomalyExplanations.length} explanations`}
              icon={<CircleAlert className="h-4 w-4 text-muted-foreground" />}
              title="Anomaly explanations"
            >
              {center.anomalyExplanations.length ? (
                center.anomalyExplanations.map((anomaly) => (
                  <AnomalyRow anomaly={anomaly} key={anomaly.id} />
                ))
              ) : (
                <EmptyLine>No workspace anomaly needs explanation.</EmptyLine>
              )}
            </PanelBlock>
          </section>

          <section className="space-y-3">
            <PanelBlock
              badge={`${center.recommendedActions.length} actions`}
              icon={<ArrowRight className="h-4 w-4 text-muted-foreground" />}
              title="Recommended actions"
            >
              {center.recommendedActions.length ? (
                center.recommendedActions.map((action) => (
                  <RecommendedActionRow action={action} key={action.id} />
                ))
              ) : (
                <EmptyLine>No recommended action is pending.</EmptyLine>
              )}
            </PanelBlock>

            <PanelBlock
              badge={`${center.digestPackets.length} packets`}
              icon={<BellRing className="h-4 w-4 text-muted-foreground" />}
              title="Scheduled digests"
            >
              {center.digestPackets.map((packet) => (
                <DigestPacketRow key={packet.id} packet={packet} />
              ))}
            </PanelBlock>

            {center.nextActions.length ? (
              <PanelBlock
                badge={`${center.nextActions.length} next`}
                icon={<ArrowRight className="h-4 w-4 text-muted-foreground" />}
                title="Briefing next actions"
              >
                {center.nextActions.map((action) => (
                  <p
                    className="flex gap-2 text-xs text-muted-foreground"
                    key={action}
                  >
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{action}</span>
                  </p>
                ))}
              </PanelBlock>
            ) : null}
          </section>
        </div>
      </CardContent>
    </Card>
  );
}

function ExecutiveSummaryCard({
  summary,
}: {
  summary: WorkspaceExecutiveSummary;
}) {
  return (
    <article className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={summary.status} />
            <h3 className="truncate text-sm font-semibold">{summary.title}</h3>
          </div>
          <p className="mt-1 text-xs font-medium">{summary.headline}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {summary.detail}
          </p>
        </div>
        <Badge variant={statusVariants[summary.status]}>
          {summary.score}/100
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {summary.evidence.slice(0, 4).map((item) => (
          <Badge key={item} variant="outline">
            {item}
          </Badge>
        ))}
      </div>
    </article>
  );
}

function AnomalyRow({ anomaly }: { anomaly: WorkspaceAnomalyExplanation }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{anomaly.title}</p>
          <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
            {anomaly.explanation}
          </p>
        </div>
        <Badge variant={severityVariants[anomaly.severity]}>
          {anomaly.severity}
        </Badge>
      </div>
    </div>
  );
}

function RecommendedActionRow({
  action,
}: {
  action: WorkspaceRecommendedAction;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{action.title}</p>
          <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
            {action.detail}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Owner: {action.ownerHint}
          </p>
        </div>
        <Badge variant={priorityVariants[action.priority]}>
          {action.priority}
        </Badge>
      </div>
    </div>
  );
}

function DigestPacketRow({
  packet,
}: {
  packet: WorkspaceIntelligenceDigestPacket;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">{packet.audience}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {packet.cadence} / {formatDateTime(packet.scheduledFor)}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <a download={packet.fileName} href={packet.dataUrl}>
            <Download className="h-4 w-4" />
            Packet
          </a>
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {packet.topics.slice(0, 6).map((topic) => (
          <Badge key={topic} variant="outline">
            {topic}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function PanelBlock({
  badge,
  children,
  icon,
  title,
}: {
  badge: string;
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <Badge variant="outline">{badge}</Badge>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-[11px] font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
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

function StatusIcon({ status }: { status: WorkspaceIntelligenceStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  }

  if (status === "blocked") {
    return <ShieldAlert className="h-4 w-4 text-destructive" />;
  }

  return (
    <CircleAlert
      className={cn("h-4 w-4", "text-amber-600 dark:text-amber-400")}
    />
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
