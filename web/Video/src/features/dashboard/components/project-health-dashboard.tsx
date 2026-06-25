"use client";

import { CircleAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  createProjectLibraryHealthReport,
  type ProjectHealthStatus,
  type ProjectHealthSummary,
} from "@/lib/projects/project-health";

export type HealthFilter = "all" | ProjectHealthStatus;

export const healthFilterLabels: Record<HealthFilter, string> = {
  all: "All health",
  ready: "Ready",
  attention: "Attention",
  blocked: "Blocked",
};

export function ProjectLibraryHealthSummary({
  report,
  className = "",
}: {
  report: ReturnType<typeof createProjectLibraryHealthReport>;
  className?: string;
}) {
  if (report.total === 0) return null;

  return (
    <div className={`grid gap-2 sm:grid-cols-4 ${className}`}>
      <HealthMetric label="Ready" value={report.ready} status="ready" />
      <HealthMetric label="Attention" value={report.attention} status="attention" />
      <HealthMetric label="Blocked" value={report.blocked} status="blocked" />
      <div className="rounded-md border border-border p-3 text-sm">
        <div className="text-xs text-muted-foreground">Media and review</div>
        <div className="mt-1 flex flex-wrap gap-1">
          <Badge variant="outline">{report.recoverableMedia} recoverable</Badge>
          <Badge variant={report.reconnectRequiredMedia > 0 ? "destructive" : "outline"}>{report.reconnectRequiredMedia} reconnect</Badge>
          <Badge variant={report.reviewItems > 0 ? "default" : "outline"}>{report.reviewItems} review</Badge>
        </div>
      </div>
    </div>
  );
}

export function ProjectHealthBadge({ summary }: { summary: ProjectHealthSummary }) {
  return (
    <Badge variant={healthBadgeVariant(summary.status)}>
      {summary.label}
      {summary.blockers > 0 ? ` ${summary.blockers}` : summary.warnings > 0 ? ` ${summary.warnings}` : ""}
    </Badge>
  );
}

export function matchesHealthFilter(summary: ProjectHealthSummary | undefined, filter: HealthFilter) {
  if (filter === "all") return true;
  return summary?.status === filter;
}

function HealthMetric({ label, value, status }: { label: string; value: number; status: ProjectHealthStatus }) {
  const Icon = status === "ready" ? ShieldCheck : CircleAlert;

  return (
    <div className="flex items-center justify-between rounded-md border border-border p-3">
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-lg font-semibold">{value}</div>
      </div>
      <Icon className={`size-4 ${status === "blocked" ? "text-destructive" : status === "attention" ? "text-amber-300" : "text-primary"}`} />
    </div>
  );
}

function healthBadgeVariant(status: ProjectHealthStatus) {
  if (status === "blocked") return "destructive";
  if (status === "attention") return "default";
  return "outline";
}
