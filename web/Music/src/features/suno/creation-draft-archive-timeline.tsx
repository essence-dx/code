"use client";

import {
  Clock3,
  Download,
  Filter,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  creationDraftArchiveEventLimit,
  type CreationDraftArchiveEvent,
  type CreationDraftArchiveEventType,
} from "@/features/ai/creation-draft-archive-events";

type CreationDraftArchiveTimelineProps = {
  events: CreationDraftArchiveEvent[];
  onClear: () => void;
  onExport: () => void;
};

type TimelineFilter = CreationDraftArchiveEventType | "all";
type ClearReviewExportLabelState =
  (typeof clearReviewExportLabelStates)[keyof typeof clearReviewExportLabelStates];
type ClearReviewExportCopy = Readonly<{
  actionLabel: string;
  buttonText: string;
}>;
type ClearReviewExportCopyByState = Readonly<
  Record<ClearReviewExportLabelState, ClearReviewExportCopy>
>;
type ClearReviewExportCopyLookup = (
  labelState: ClearReviewExportLabelState,
) => ClearReviewExportCopy;
type ClearReviewExportTimestamp = number | null;
type ClearReviewExportLabelStateResolver = (
  exportTimestamp: ClearReviewExportTimestamp,
) => ClearReviewExportLabelState;

const timelineFilters: { label: string; value: TimelineFilter }[] = [
  { label: "All", value: "all" },
  { label: "Imports", value: "archive-import" },
  { label: "Restores", value: "recovery-restore" },
  { label: "Exports", value: "recovery-export" },
  { label: "Dismissals", value: "recovery-dismiss" },
];
const visibleTimelineEventLimit = 6;
const clearReviewScopeId = "archive-timeline-clear-scope";
const clearReviewMetricsId = "archive-timeline-clear-metrics";
const clearReviewExportStatusId = "archive-timeline-clear-export-status";
const clearReviewSafetyId = "archive-timeline-clear-safety";
const clearReviewExportLabelStates = {
  afterExport: "after-export",
  beforeExport: "before-export",
} as const;
const clearReviewExportCopyByState: ClearReviewExportCopyByState = {
  [clearReviewExportLabelStates.afterExport]: {
    actionLabel:
      "Export archive timeline again. Saved export available in this review.",
    buttonText: "Export again",
  },
  [clearReviewExportLabelStates.beforeExport]: {
    actionLabel: "Export archive timeline before clearing.",
    buttonText: "Export first",
  },
} as const;
const clearReviewKeepActionLabel =
  "Keep archive timeline history and close this review.";
const clearReviewClearActionLabel =
  "Clear archive timeline events, reset timeline filters, and close this review.";
const clearReviewSafetyLabel =
  "Safety: draft vaults and recovery snapshots stay preserved.";

export function CreationDraftArchiveTimeline({
  events,
  onClear,
  onExport,
}: CreationDraftArchiveTimelineProps) {
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isClearReviewOpen, setIsClearReviewOpen] = useState(false);
  const [clearReviewExportedAt, setClearReviewExportedAt] =
    useState<ClearReviewExportTimestamp>(null);
  const [clearReviewExportCount, setClearReviewExportCount] = useState(0);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const hasActiveTimelineView = filter !== "all" || normalizedSearch.length > 0;
  const clearReviewExportLabelState =
    getClearReviewExportLabelState(clearReviewExportedAt);
  const hasExportedFromClearReview =
    clearReviewExportLabelState === clearReviewExportLabelStates.afterExport;
  const clearReviewExportSummary = formatClearReviewExportSummary(
    clearReviewExportedAt,
    clearReviewExportCount,
  );
  const clearReviewActionContextIds = getClearReviewActionContextIds(
    Boolean(clearReviewExportSummary),
  );
  const clearReviewExportCopy = getClearReviewExportCopy(
    clearReviewExportLabelState,
  );
  const summary = useMemo(() => summarizeTimelineEvents(events), [events]);
  const remainingTimelineSlots = Math.max(
    0,
    creationDraftArchiveEventLimit - events.length,
  );
  const isTimelineAtCapacity = remainingTimelineSlots === 0;
  const filteredEvents = useMemo(
    () => {
      return events.filter((event) => {
        const matchesFilter = filter === "all" || event.type === filter;
        const matchesSearch =
          !normalizedSearch ||
          searchableEventText(event).includes(normalizedSearch);

        return matchesFilter && matchesSearch;
      });
    },
    [events, filter, normalizedSearch],
  );
  const hiddenCount = events.length - filteredEvents.length;
  const displayedEvents = filteredEvents.slice(0, visibleTimelineEventLimit);
  const remainingVisibleEvents = Math.max(
    0,
    filteredEvents.length - displayedEvents.length,
  );
  const resetTimelineView = () => {
    setFilter("all");
    setSearchQuery("");
  };
  const clearReviewScope = hiddenCount
    ? `${filteredEvents.length} visible, ${hiddenCount} hidden.`
    : "All saved events are visible.";
  const openClearReview = () => {
    setClearReviewExportedAt(null);
    setClearReviewExportCount(0);
    setIsClearReviewOpen(true);
  };
  const exportFromClearReview = () => {
    setClearReviewExportedAt(Date.now());
    setClearReviewExportCount((count) => count + 1);
    onExport();
  };

  if (!events.length) {
    return null;
  }

  return (
    <div className="mt-3 rounded-md border border-white/10 bg-black/20 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            <Clock3 className="size-4 text-sky-300" />
            Archive timeline
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Metadata-only local history for recent archive and recovery actions.
            Latest {creationDraftArchiveEventLimit} events kept locally.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isTimelineAtCapacity
              ? "History cap reached; oldest entries are replaced by newer actions."
              : `${remainingTimelineSlots} history slot${remainingTimelineSlots === 1 ? "" : "s"} available.`}
          </p>
          {isTimelineAtCapacity ? (
            <p className="mt-1 text-xs text-sky-200">
              Export the full timeline before older entries rotate out.
            </p>
          ) : null}
          {hiddenCount ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {hiddenCount} event{hiddenCount === 1 ? "" : "s"} hidden by
              filters.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-2"
            title="Export full archive timeline"
            onClick={onExport}
          >
            <Download className="size-4" />
            Export full timeline
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="gap-2"
            title="Review archive timeline clear"
            onClick={openClearReview}
          >
            <Trash2 className="size-4" />
            Clear timeline
          </Button>
        </div>
      </div>
      {isClearReviewOpen ? (
        <div className="mt-3 rounded-md border border-amber-300/30 bg-amber-300/10 p-3">
          <p className="text-sm font-medium text-amber-100">
            Clear {events.length} metadata-only timeline event
            {events.length === 1 ? "" : "s"}?
          </p>
          <p
            id={clearReviewScopeId}
            className="mt-1 text-xs text-amber-100/80"
          >
            <span className="font-medium text-amber-50">Scope:</span> Full
            metadata history. {clearReviewScope}
          </p>
          <div
            id={clearReviewMetricsId}
            className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-amber-100/80"
            aria-label="Archive timeline clear summary"
          >
            <span className="font-medium text-amber-50">Counts</span>
            <ClearReviewMetric label="Total" value={events.length} />
            <ClearReviewMetric label="Visible" value={filteredEvents.length} />
            <ClearReviewMetric label="Hidden" value={hiddenCount} />
          </div>
          {clearReviewExportSummary ? (
            <p
              id={clearReviewExportStatusId}
              className="mt-2 text-xs text-amber-100/80"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {clearReviewExportSummary}
            </p>
          ) : null}
          <p
            id={clearReviewSafetyId}
            className="mt-2 text-xs font-medium text-amber-50"
          >
            {clearReviewSafetyLabel}
          </p>
          <div
            className="mt-3 flex flex-wrap gap-2"
            role="group"
            aria-label="Archive timeline clear review actions"
            aria-describedby={clearReviewActionContextIds}
          >
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              title={clearReviewExportCopy.actionLabel}
              aria-label={clearReviewExportCopy.actionLabel}
              onClick={exportFromClearReview}
            >
              <Download className="size-4" />
              {clearReviewExportCopy.buttonText}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              title={clearReviewKeepActionLabel}
              aria-label={clearReviewKeepActionLabel}
              onClick={() => {
                setClearReviewExportedAt(null);
                setClearReviewExportCount(0);
                setIsClearReviewOpen(false);
              }}
            >
              Keep history
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="gap-2"
              title={clearReviewClearActionLabel}
              aria-label={clearReviewClearActionLabel}
              aria-describedby={clearReviewSafetyId}
              onClick={() => {
                setClearReviewExportedAt(null);
                setClearReviewExportCount(0);
                setIsClearReviewOpen(false);
                resetTimelineView();
                onClear();
              }}
            >
              <Trash2 className="size-4" />
              Clear events
            </Button>
          </div>
        </div>
      ) : null}
      <div
        className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-y border-white/10 py-2 text-xs text-muted-foreground"
        aria-label="Archive timeline summary"
      >
        <TimelineMetric label="Events" value={summary.totalEvents} />
        <TimelineMetric label="Imports" value={summary.imports} />
        <TimelineMetric label="Restores" value={summary.restores} />
        <TimelineMetric label="Exports" value={summary.exports} />
        <TimelineMetric label="Dismissals" value={summary.dismissals} />
        <TimelineMetric
          label="History cap"
          value={creationDraftArchiveEventLimit}
        />
        <TimelineMetric label="Open slots" value={remainingTimelineSlots} />
        <TimelineMetric
          label="Imported drafts"
          value={summary.importedDrafts}
        />
        <TimelineMetric
          label="Restored drafts"
          value={summary.restoredDrafts}
        />
      </div>
      <div
        className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
        aria-label="Archive timeline controls"
      >
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Archive timeline filters"
        >
          <Filter className="size-4 text-muted-foreground" />
          {timelineFilters.map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={filter === item.value ? "secondary" : "ghost"}
              aria-pressed={filter === item.value}
              title={`Show ${item.label.toLowerCase()} timeline events`}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </Button>
          ))}
          <span className="text-xs text-muted-foreground">
            {filteredEvents.length} of {events.length} visible
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative md:w-60">
            <label className="sr-only" htmlFor="archive-timeline-search">
              Search archive timeline
            </label>
            <Search className="pointer-events-none absolute left-2.5 top-2 size-4 text-muted-foreground" />
            <Input
              id="archive-timeline-search"
              type="search"
              value={searchQuery}
              placeholder="Search timeline"
              className="pl-8"
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          {hasActiveTimelineView && hiddenCount > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-2"
              title="Reset archive timeline filters and search"
              onClick={resetTimelineView}
            >
              <RotateCcw className="size-4" />
              Reset view
            </Button>
          ) : null}
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {displayedEvents.map((event, index) => (
          <div
            key={event.id}
            className="rounded-md border border-white/10 bg-slate-950/40 p-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{eventLabel(event.type)}</Badge>
              {index === 0 ? (
                <Badge variant="outline">Newest visible</Badge>
              ) : null}
              {event.archiveScope ? (
                <Badge variant="outline">
                  {archiveScopeLabel(event.archiveScope)}
                </Badge>
              ) : null}
              {event.archiveVersion !== undefined ? (
                <Badge variant="outline">
                  {event.archiveVersion
                    ? `Archive v${event.archiveVersion}`
                    : "Legacy archive"}
                </Badge>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {formatTimelineTime(event.createdAt)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {eventSummary(event)}
            </p>
          </div>
        ))}
        {remainingVisibleEvents ? (
          <div className="rounded-md border border-white/10 bg-slate-950/40 p-3 text-xs text-muted-foreground">
            Showing first {visibleTimelineEventLimit} visible events;{" "}
            {remainingVisibleEvents} more match the current view.
          </div>
        ) : null}
        {!filteredEvents.length ? (
          <div className="flex flex-col gap-2 rounded-md border border-white/10 bg-slate-950/40 p-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>No timeline events match the current filter.</span>
            {hasActiveTimelineView ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="gap-2"
                title="Reset archive timeline filters and search"
                onClick={resetTimelineView}
              >
                <RotateCcw className="size-4" />
                Reset view
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ClearReviewMetric({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{label}</span>
      <strong className="font-medium text-amber-50">{value}</strong>
    </span>
  );
}

function TimelineMetric({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{label}</span>
      <strong className="font-medium text-foreground">{value}</strong>
    </span>
  );
}

function summarizeTimelineEvents(events: CreationDraftArchiveEvent[]) {
  return events.reduce(
    (summary, event) => {
      if (event.type === "archive-import") {
        summary.imports += 1;
        summary.importedDrafts += event.draftCount ?? 0;
      }

      if (event.type === "recovery-restore") {
        summary.restores += 1;
        summary.restoredDrafts += event.draftCount ?? 0;
      }

      if (event.type === "recovery-export") {
        summary.exports += 1;
      }

      if (event.type === "recovery-dismiss") {
        summary.dismissals += 1;
      }

      return summary;
    },
    {
      dismissals: 0,
      exports: 0,
      importedDrafts: 0,
      imports: 0,
      restoredDrafts: 0,
      restores: 0,
      totalEvents: events.length,
    },
  );
}

function searchableEventText(event: CreationDraftArchiveEvent) {
  return [
    event.type,
    eventLabel(event.type),
    event.archiveScope ? archiveScopeLabel(event.archiveScope) : "",
    event.archiveVersion === undefined
      ? ""
      : event.archiveVersion
        ? `archive v${event.archiveVersion}`
        : "legacy archive",
    recoveryReasonLabel(event.recoveryReason),
    event.draftCount === undefined ? "" : `${event.draftCount} draft`,
    event.totalDrafts === undefined ? "" : `${event.totalDrafts} total`,
    event.skipped === undefined ? "" : `${event.skipped} skipped`,
    event.duplicates === undefined ? "" : `${event.duplicates} duplicate`,
    event.invalid === undefined ? "" : `${event.invalid} invalid`,
    event.capacityLimited === undefined
      ? ""
      : `${event.capacityLimited} over limit`,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function eventLabel(type: CreationDraftArchiveEvent["type"]) {
  if (type === "archive-import") {
    return "Import";
  }

  if (type === "recovery-restore") {
    return "Restore";
  }

  if (type === "recovery-export") {
    return "Recovery export";
  }

  return "Recovery dismiss";
}

function recoveryReasonLabel(
  reason: CreationDraftArchiveEvent["recoveryReason"],
) {
  if (reason === "archive-import") {
    return "Before archive import";
  }

  if (reason === "recovery-restore") {
    return "Before recovery restore";
  }

  return "";
}

function eventSummary(event: CreationDraftArchiveEvent) {
  const count = event.draftCount ?? 0;
  const total = event.totalDrafts ?? 0;
  const details = [
    event.skipped ? `${event.skipped} skipped` : "",
    event.duplicates ? `${event.duplicates} duplicate` : "",
    event.invalid ? `${event.invalid} invalid` : "",
    event.capacityLimited ? `${event.capacityLimited} over limit` : "",
  ].filter(Boolean);
  const suffix = details.length ? ` (${details.join(", ")})` : "";

  if (event.type === "archive-import") {
    return `Imported ${count} of ${total} draft${total === 1 ? "" : "s"}${suffix}.`;
  }

  if (event.type === "recovery-restore") {
    return `Restored ${count} draft${count === 1 ? "" : "s"} from recovery${suffix}.`;
  }

  if (event.type === "recovery-export") {
    return `Exported recovery snapshot with ${count} draft${count === 1 ? "" : "s"}.`;
  }

  return `Dismissed recovery snapshot with ${count} draft${count === 1 ? "" : "s"}.`;
}

function archiveScopeLabel(scope: CreationDraftArchiveEvent["archiveScope"]) {
  if (scope === "selected-visible") {
    return "Selected archive";
  }

  if (scope === "full-vault") {
    return "Full archive";
  }

  return "Legacy archive";
}

function formatTimelineTime(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatClearReviewExportTime(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    timeStyle: "short",
  }).format(value);
}

function formatClearReviewExportSummary(
  exportTimestamp: ClearReviewExportTimestamp,
  exportCount: number,
) {
  if (!exportTimestamp) {
    return null;
  }

  const repeatSummary =
    exportCount > 1 ? ` (${exportCount} exports this review)` : "";

  return [
    `Export saved at ${formatClearReviewExportTime(exportTimestamp)}${repeatSummary}.`,
    "This review stays open until you keep or clear history.",
  ].join(" ");
}

function getClearReviewActionContextIds(hasExportStatus: boolean) {
  return [
    clearReviewScopeId,
    clearReviewMetricsId,
    hasExportStatus ? clearReviewExportStatusId : "",
    clearReviewSafetyId,
  ]
    .filter(Boolean)
    .join(" ");
}

const getClearReviewExportCopy: ClearReviewExportCopyLookup = (labelState) =>
  clearReviewExportCopyByState[labelState];

const getClearReviewExportLabelState: ClearReviewExportLabelStateResolver = (
  exportTimestamp,
) => {
  if (exportTimestamp === null) {
    return clearReviewExportLabelStates.beforeExport;
  }

  return clearReviewExportLabelStates.afterExport;
};
