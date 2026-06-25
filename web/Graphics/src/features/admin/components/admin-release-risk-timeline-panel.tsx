"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ClipboardCopy,
  Download,
  FileJson2,
  GitBranch,
  Search,
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
import { Input } from "@/components/ui/input";
import type {
  AdminReleaseRiskTimelineDimension,
  AdminReleaseRiskTimelineReport,
  AdminReleaseRiskTimelineSeverity,
  AdminReleaseRiskTimelineStatus,
} from "@/features/admin/admin-release-risk-timeline";
import {
  filterAdminReleaseRiskTimelineEvents,
  getAdminReleaseRiskTimelineCsv,
  getAdminReleaseRiskTimelineJson,
  getAdminReleaseRiskTimelineMarkdown,
} from "@/features/admin/admin-release-risk-timeline";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminReleaseRiskTimelinePanelProps = {
  report: AdminReleaseRiskTimelineReport;
};

const dimensionOptions: Array<AdminReleaseRiskTimelineDimension | "all"> = [
  "all",
  "data-loss",
  "self-hosted-sync",
  "publication-approval",
  "realtime-health",
  "deployment-smoke",
  "collaboration-incident",
];

const severityOptions: Array<AdminReleaseRiskTimelineSeverity | "all"> = [
  "all",
  "high",
  "medium",
  "low",
];

export function AdminReleaseRiskTimelinePanel({
  report,
}: AdminReleaseRiskTimelinePanelProps) {
  const [query, setQuery] = useState("");
  const [dimension, setDimension] =
    useState<(typeof dimensionOptions)[number]>("all");
  const [severity, setSeverity] =
    useState<(typeof severityOptions)[number]>("all");
  const events = useMemo(
    () =>
      filterAdminReleaseRiskTimelineEvents(report.events, query)
        .filter((event) => dimension === "all" || event.dimension === dimension)
        .filter((event) => severity === "all" || event.severity === severity)
        .slice(0, 24),
    [dimension, query, report.events, severity],
  );

  function exportJson() {
    downloadTextFile({
      content: getAdminReleaseRiskTimelineJson(report),
      filename: "admin-release-risk-timeline.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminReleaseRiskTimelineCsv(report),
      filename: "admin-release-risk-timeline.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminReleaseRiskTimelineMarkdown(report),
      filename: "admin-release-risk-timeline.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminReleaseRiskTimelineMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="size-4" />
            Release risk timeline
          </CardTitle>
          <CardDescription>
            Cross-source release risks from DLP, sync diagnostics, approvals,
            realtime health, deployment smoke, and collaboration incidents.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(report.status)}>
            {report.status} {report.score}
          </Badge>
          <Badge variant="outline">{report.eventCount} events</Badge>
          <Badge variant="outline">{report.correlationCount} correlations</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-4">
          <Metric label="High risk" value={report.highRiskCount} />
          <Metric label="Medium risk" value={report.mediumRiskCount} />
          <Metric label="Blocked" value={report.blockedCount} />
          <Metric label="Commands" value={report.commandCount} />
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search approval, DLP, route smoke, replay window, sync repair..."
              className="pl-8"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Button type="button" size="sm" variant="outline" onClick={exportJson}>
              <FileJson2 className="size-3.5" />
              JSON
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={exportCsv}>
              <Download className="size-3.5" />
              CSV
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={exportMarkdown}
            >
              <Download className="size-3.5" />
              MD
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={copyMarkdown}
            >
              <ClipboardCopy className="size-3.5" />
              Copy
            </Button>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <FilterGroup
            label="Dimensions"
            value={dimension}
            values={dimensionOptions}
            onValueChange={setDimension}
          />
          <FilterGroup
            label="Severity"
            value={severity}
            values={severityOptions}
            onValueChange={setSeverity}
          />
        </div>

        <div className="grid gap-2 text-xs md:grid-cols-2 xl:grid-cols-3">
          {report.dimensionSummaries.map((summary) => (
            <div
              key={summary.dimension}
              className="rounded-md border border-border bg-muted/20 p-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{summary.dimension}</span>
                <Badge variant="outline">{summary.count}</Badge>
              </div>
              <div className="mt-1 text-muted-foreground">
                {summary.blockedCount} blocked / {summary.reviewCount} review
              </div>
            </div>
          ))}
        </div>

        {report.correlations.length > 0 ? (
          <div className="grid gap-2 text-xs lg:grid-cols-3">
            {report.correlations.map((correlation) => (
              <div
                key={correlation.id}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{correlation.title}</div>
                  <Badge variant={getSeverityVariant(correlation.severity)}>
                    {correlation.severity}
                  </Badge>
                </div>
                <p className="mt-2 text-muted-foreground">
                  {correlation.detail}
                </p>
                <p className="mt-2">{correlation.recommendation}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="font-medium">Timeline events</div>
            <Badge variant="outline">{events.length} shown</Badge>
          </div>
          <div className="grid gap-2 xl:grid-cols-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="rounded-md border border-border bg-muted/20 p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      <AlertTriangle className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{event.label}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="outline">{event.dimension}</Badge>
                      <Badge variant={getStatusVariant(event.status)}>
                        {event.status}
                      </Badge>
                      <Badge variant={getSeverityVariant(event.severity)}>
                        {event.severity}
                      </Badge>
                      {event.score !== null ? (
                        <Badge variant="outline">score {event.score}</Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {event.summary}
                </p>
                <p className="mt-2 text-xs">{event.evidence}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="outline">{event.owner}</Badge>
                  <Badge variant="outline">{formatDate(event.occurredAt)}</Badge>
                </div>
                {event.command ? (
                  <div className="mt-2 rounded-md border border-border bg-background p-2 font-mono text-[11px] text-muted-foreground">
                    {event.command}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterGroup<TValue extends string>({
  label,
  onValueChange,
  value,
  values,
}: {
  label: string;
  onValueChange: (value: TValue) => void;
  value: TValue;
  values: TValue[];
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2">
      <div className="mb-2 text-xs font-medium text-muted-foreground">
        {label}
      </div>
      <div className="flex flex-wrap gap-1">
        {values.map((option) => (
          <Button
            key={option}
            type="button"
            size="xs"
            variant={option === value ? "default" : "ghost"}
            onClick={() => onValueChange(option)}
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm text-foreground">{value}</div>
    </div>
  );
}

function getStatusVariant(status: AdminReleaseRiskTimelineStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}

function getSeverityVariant(severity: AdminReleaseRiskTimelineSeverity) {
  return severity === "high"
    ? "destructive"
    : severity === "medium"
      ? "secondary"
      : "outline";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
