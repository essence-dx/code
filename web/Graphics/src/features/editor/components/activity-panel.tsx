"use client";

import { useMemo, useState } from "react";
import {
  Clock3,
  Component,
  Download,
  FileDown,
  FileUp,
  GitBranch,
  GitMerge,
  Library,
  MessageSquare,
  PanelsTopLeft,
  Puzzle,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  activityEventsToCsv,
} from "@/features/editor/activity-log";
import { getCommandActionReplayReport } from "@/features/editor/command-action-replay";
import { getSlowCommandTelemetryReport } from "@/features/editor/command-telemetry";
import { ActivityConflictReviewPanel } from "@/features/editor/components/activity-conflict-review-panel";
import { CommandActionReplayPanel } from "@/features/editor/components/command-action-replay-panel";
import { SlowCommandTelemetryPanel } from "@/features/editor/components/slow-command-telemetry-panel";
import { getExportActivityReviewRows } from "@/features/editor/exporters/export-history";
import type {
  DesignActivityEvent,
  DesignActivityKind,
} from "@/features/editor/types";

type ActivityPanelProps = {
  events: DesignActivityEvent[];
  onClearActivity: () => void;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type ActivityFilter = "all" | "review" | "assets" | DesignActivityKind;

const activityLabels = {
  page: "Pages",
  component: "Components",
  library: "Libraries",
  version: "Versions",
  branch: "Branches",
  comment: "Comments",
  extension: "Extensions",
  export: "Exports",
  import: "Imports",
} satisfies Record<DesignActivityKind, string>;

export function ActivityPanel({
  events,
  onClearActivity,
  onRecordActivity,
}: ActivityPanelProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const counts = getActivityCounts(events);
  const exportRows = useMemo(
    () => getExportActivityReviewRows(events).slice(0, 4),
    [events],
  );
  const commandTelemetryReport = useMemo(
    () => getSlowCommandTelemetryReport(events),
    [events],
  );
  const commandActionReplayReport = useMemo(
    () => getCommandActionReplayReport(events),
    [events],
  );
  const filteredEvents = useMemo(
    () => getFilteredEvents(events, filter, query),
    [events, filter, query],
  );

  function exportCsv() {
    const blob = new Blob([activityEventsToCsv(filteredEvents)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "document-activity.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="space-y-2 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 flex-1">Activity</span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              disabled={events.length === 0}
              aria-label="Export activity as CSV"
              onClick={exportCsv}
            >
              <Download className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              disabled={events.length === 0}
              aria-label="Clear activity history"
              onClick={onClearActivity}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5 normal-case tracking-normal">
          <ActivityMetric label="All" value={events.length} />
          <ActivityMetric label="Visible" value={filteredEvents.length} />
          <ActivityMetric label="Exports" value={counts.export} />
        </div>
        <ActivityConflictReviewPanel
          events={events}
          onRecordActivity={onRecordActivity}
        />
        <SlowCommandTelemetryPanel
          report={commandTelemetryReport}
          onRecordActivity={onRecordActivity}
        />
        <CommandActionReplayPanel
          report={commandActionReplayReport}
          onRecordActivity={onRecordActivity}
        />
        <div className="relative normal-case tracking-normal">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            className="h-8 pl-7 text-xs"
            placeholder="Search activity"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1 normal-case tracking-normal">
          {activityFilters.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={filter === item.id ? "secondary" : "ghost"}
              className="h-7 px-2 text-xs"
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        {exportRows.length > 0 &&
        (filter === "all" || filter === "export") ? (
          <div className="space-y-1 rounded-md border border-border bg-background p-1 normal-case tracking-normal">
            {exportRows.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-2 rounded-sm px-2 py-1 text-[11px]"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground">
                    {row.label}
                  </span>
                  <span className="block truncate text-muted-foreground">
                    {row.formats.length > 0
                      ? `${row.formats.join(", ")} / ${row.scale}`
                      : row.detail || "Single export"}
                  </span>
                </span>
                <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {row.fileCount ?? 1} files
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-2">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-md border border-border bg-background p-2"
              >
                <div className="flex items-start gap-2">
                  <div className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                    <ActivityIcon kind={event.kind} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {event.label}
                      </span>
                      <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {activityLabels[event.kind]}
                      </span>
                    </div>
                    {event.detail ? (
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {event.detail}
                      </div>
                    ) : null}
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="min-w-0 truncate">
                        {event.actorName}
                      </span>
                      <span className="shrink-0">{formatDate(event.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : events.length > 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              <Search className="size-5" />
              No activity matches this review.
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              <Clock3 className="size-5" />
              Document activity will appear here as the file changes.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

const activityFilters = [
  { id: "all", label: "All" },
  { id: "review", label: "Review" },
  { id: "assets", label: "Assets" },
  { id: "branch", label: "Branch" },
  { id: "page", label: "Pages" },
  { id: "export", label: "Export" },
  { id: "import", label: "Import" },
] as const satisfies ReadonlyArray<{ id: ActivityFilter; label: string }>;

function ActivityMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background px-2 py-1.5">
      <div className="truncate text-[11px] text-muted-foreground">{label}</div>
      <div className="font-mono text-sm text-foreground">{value}</div>
    </div>
  );
}

function getFilteredEvents(
  events: DesignActivityEvent[],
  filter: ActivityFilter,
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();

  return events.filter((event) => {
    if (!matchesActivityFilter(event, filter)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      event.kind,
      event.label,
      event.detail ?? "",
      event.actorName,
      event.actorEmail ?? "",
      event.targetId ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

function matchesActivityFilter(
  event: DesignActivityEvent,
  filter: ActivityFilter,
) {
  if (filter === "all") {
    return true;
  }

  if (filter === "review") {
    return (
      event.kind === "branch" ||
      event.kind === "comment" ||
      event.kind === "version"
    );
  }

  if (filter === "assets") {
    return event.kind === "component" || event.kind === "library";
  }

  return event.kind === filter;
}

function ActivityIcon({ kind }: { kind: DesignActivityKind }) {
  if (kind === "page") {
    return <PanelsTopLeft className="size-4" />;
  }

  if (kind === "component") {
    return <Component className="size-4" />;
  }

  if (kind === "library") {
    return <Library className="size-4" />;
  }

  if (kind === "version") {
    return <GitMerge className="size-4" />;
  }

  if (kind === "branch") {
    return <GitBranch className="size-4" />;
  }

  if (kind === "comment") {
    return <MessageSquare className="size-4" />;
  }

  if (kind === "extension") {
    return <Puzzle className="size-4" />;
  }

  if (kind === "export") {
    return <FileDown className="size-4" />;
  }

  return <FileUp className="size-4" />;
}

function getActivityCounts(events: DesignActivityEvent[]) {
  return events.reduce<Record<DesignActivityKind, number>>(
    (counts, event) => ({
      ...counts,
      [event.kind]: counts[event.kind] + 1,
    }),
    {
      page: 0,
      component: 0,
      library: 0,
      version: 0,
      branch: 0,
      comment: 0,
      extension: 0,
      export: 0,
      import: 0,
    },
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
