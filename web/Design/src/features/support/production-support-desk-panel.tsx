"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Download,
  ExternalLink,
  LifeBuoy,
  ShieldAlert,
} from "lucide-react";

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
  ProductionSupportDesk,
  ProductionSupportDeskStatus,
  ProductionSupportIssue,
  ProductionSupportSeverity,
  ProductionSupportView,
} from "@/features/support/production-support-desk";
import { cn } from "@/lib/utils";

type ProductionSupportDeskPanelProps = {
  desk: ProductionSupportDesk;
};

const statusLabels: Record<ProductionSupportDeskStatus, string> = {
  ready: "Ready",
  triage: "Triage",
  urgent: "Urgent",
};

const statusVariants: Record<
  ProductionSupportDeskStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  triage: "outline",
  urgent: "destructive",
};

const severityLabels: Record<ProductionSupportSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const severityVariants: Record<
  ProductionSupportSeverity,
  "secondary" | "outline" | "destructive"
> = {
  low: "secondary",
  medium: "outline",
  high: "outline",
  urgent: "destructive",
};

export function ProductionSupportDeskPanel({
  desk,
}: ProductionSupportDeskPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5" />
              Production support desk
            </CardTitle>
            <CardDescription>
              User-reported issues, affected project links, audit context,
              reproduction notes, and support-ready resolution packets.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[desk.status]}>
              {desk.score}/100 {statusLabels[desk.status]}
            </Badge>
            <Badge variant="outline">
              {desk.totals.openIssues.toLocaleString()} open
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="User reports" value={desk.totals.userReportedIssues} />
          <Metric label="Failures" value={desk.totals.productionFailures} />
          <Metric label="Readiness" value={desk.totals.readinessIssues} />
          <Metric label="Urgent" value={desk.totals.urgentIssues} />
          <Metric label="Packets" value={desk.totals.resolutionPackets} />
          <Metric label="Score" value={desk.score} />
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          {desk.views.map((view) => (
            <SupportViewCard key={view.id} view={view} />
          ))}
        </div>

        {desk.resolutionPackets.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  Resolution packets
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Downloadable handoff manifests for support follow-through.
                </p>
              </div>
              <Badge variant="outline">
                {desk.resolutionPackets.length.toLocaleString()} ready
              </Badge>
            </div>
            <div className="mt-3 grid gap-2 xl:grid-cols-2">
              {desk.resolutionPackets.slice(0, 4).map((packet) => (
                <div
                  key={packet.id}
                  className="rounded-md border border-border bg-background p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {packet.projectName}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {packet.summary}
                      </p>
                    </div>
                    <Badge
                      variant={
                        packet.status === "blocked"
                          ? "destructive"
                          : packet.status === "ready"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {packet.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {packet.auditLogIds.length.toLocaleString()} audit logs
                    </Badge>
                    {packet.handoffPacketScore !== null ? (
                      <Badge variant="outline">
                        {packet.handoffPacketScore}/100 packet
                      </Badge>
                    ) : null}
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={packet.download.href}
                        download={packet.download.fileName}
                      >
                        <Download className="h-4 w-4" />
                        Packet
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {desk.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              Support next actions
            </div>
            <div className="mt-2 grid gap-2">
              {desk.nextActions.map((action) => (
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

function SupportViewCard({ view }: { view: ProductionSupportView }) {
  return (
    <section className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{view.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {view.description}
          </p>
        </div>
        <Badge variant={statusVariants[view.status]}>
          {statusLabels[view.status]}
        </Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {view.issues.length ? (
          view.issues.map((issue) => (
            <SupportIssueCard key={issue.id} issue={issue} />
          ))
        ) : (
          <p className="rounded-md border border-dashed border-border bg-background p-3 text-xs text-muted-foreground">
            No open issues in this queue.
          </p>
        )}
      </div>
    </section>
  );
}

function SupportIssueCard({ issue }: { issue: ProductionSupportIssue }) {
  return (
    <article className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <SeverityIcon severity={issue.severity} />
            <span className="truncate">{issue.title}</span>
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {issue.summary}
          </p>
        </div>
        <Badge variant={severityVariants[issue.severity]}>
          {severityLabels[issue.severity]}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline">{issue.sourceLabel}</Badge>
        <Badge variant="outline">{issue.statusLabel}</Badge>
        {issue.reportedBy ? (
          <Badge variant="outline">{issue.reportedBy}</Badge>
        ) : null}
        <Button asChild size="sm" variant="ghost" className="h-7 px-2">
          <a href={issue.affectedProjectHref}>
            Project
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
      <IssueDetailList
        title="Reproduction"
        items={issue.reproductionNotes.slice(0, 3)}
      />
      {issue.auditContext.length ? (
        <IssueDetailList
          title="Audit context"
          items={issue.auditContext
            .slice(0, 3)
            .map((log) => `${formatDate(log.createdAt)} - ${log.summary}`)}
        />
      ) : null}
    </article>
  );
}

function IssueDetailList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;

  return (
    <div className="mt-3">
      <p className="text-xs font-medium">{title}</p>
      <ul className="mt-1 grid gap-1 text-xs text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ClipboardList className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: ProductionSupportSeverity }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": severity === "low",
    "text-amber-600": severity === "medium" || severity === "high",
    "text-destructive": severity === "urgent",
  });

  if (severity === "low") return <CheckCircle2 className={className} />;
  if (severity === "urgent") return <ShieldAlert className={className} />;

  return <CircleAlert className={className} />;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Recently";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
