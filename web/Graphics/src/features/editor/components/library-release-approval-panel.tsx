"use client";

import { useState } from "react";
import { CheckCircle2, Download, History, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  downloadTextFile,
  ReadinessMetric,
} from "@/features/editor/components/library-release-panel-shared";
import type {
  LibraryReleaseApprovalItem,
  LibraryReleaseApprovalReport,
  LibraryReleaseApprovalSnapshot,
} from "@/features/editor/library-release-approval";
import { getLibraryReleaseApprovalSnapshotsCsv } from "@/features/editor/library-release-approval";

type ApprovalReviewFilter = "all" | "open" | "acknowledged" | "readiness" | "risk";

export function LibraryReleaseApprovalPanel({
  report,
  snapshots,
  sessionLabel,
  reviewOwner,
  reviewerNote,
  onCaptureSnapshot,
  onRestoreSnapshot,
  onToggleItem,
  onUpdateReviewOwner,
  onUpdateReviewerNote,
  onUpdateSessionLabel,
  onUpdateNote,
}: {
  report: LibraryReleaseApprovalReport;
  snapshots: LibraryReleaseApprovalSnapshot[];
  sessionLabel: string;
  reviewOwner: string;
  reviewerNote: string;
  onCaptureSnapshot: () => void;
  onRestoreSnapshot: (snapshot: LibraryReleaseApprovalSnapshot) => void;
  onToggleItem: (itemId: string) => void;
  onUpdateReviewOwner: (owner: string) => void;
  onUpdateReviewerNote: (note: string) => void;
  onUpdateSessionLabel: (label: string) => void;
  onUpdateNote: (itemId: string, note: string) => void;
}) {
  const [filter, setFilter] = useState<ApprovalReviewFilter>("all");
  const filteredItems = report.items.filter((item) =>
    matchesApprovalReviewFilter(item, filter),
  );

  return (
    <div className="space-y-2 rounded-sm border border-border/70 bg-muted/20 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">Release approval</span>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant={report.canApprove ? "secondary" : "outline"}>
            {report.outstandingCount} pending
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 gap-1 px-1.5 text-[11px]"
            onClick={onCaptureSnapshot}
          >
            <History className="size-3" />
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 gap-1 px-1.5 text-[11px]"
            disabled={snapshots.length === 0}
            onClick={() => exportApprovalSnapshotsCsv(snapshots)}
          >
            <Download className="size-3" />
            CSV
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <ReadinessMetric label="Items" value={report.itemCount} />
        <ReadinessMetric label="Ack" value={report.acknowledgedCount} />
        <ReadinessMetric label="Open" value={report.outstandingCount} />
      </div>
      <Input
        value={sessionLabel}
        placeholder="Review session label"
        className="h-7 px-2 text-[11px]"
        onChange={(event) => onUpdateSessionLabel(event.target.value)}
      />
      <div className="grid grid-cols-2 gap-1.5">
        <Input
          value={reviewOwner}
          placeholder="Review owner"
          className="h-7 px-2 text-[11px]"
          onChange={(event) => onUpdateReviewOwner(event.target.value)}
        />
        <Input
          value={reviewerNote}
          placeholder="Reviewer note"
          className="h-7 px-2 text-[11px]"
          onChange={(event) => onUpdateReviewerNote(event.target.value)}
        />
      </div>
      {report.items.length > 0 ? (
        <div className="flex flex-wrap gap-1 rounded-sm bg-background p-1">
          {approvalReviewFilters.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                filter === item.id
                  ? "rounded-sm bg-secondary px-2 py-1 text-[11px] text-secondary-foreground"
                  : "rounded-sm px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
              }
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      {filteredItems.length > 0 ? (
        <div className="space-y-1">
          {filteredItems.map((item) => (
            <ReleaseApprovalItemRow
              key={item.id}
              item={item}
              onToggleItem={onToggleItem}
              onUpdateNote={onUpdateNote}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-sm bg-background px-2 py-1.5 text-[11px] text-muted-foreground">
          No approval items match this filter.
        </div>
      )}
      {snapshots.length > 0 ? (
        <div className="space-y-1 border-t border-border/70 pt-2">
          {snapshots.map((snapshot) => (
            <ReleaseApprovalSnapshotRow
              key={snapshot.id}
              snapshot={snapshot}
              onRestoreSnapshot={onRestoreSnapshot}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ReleaseApprovalItemRow({
  item,
  onToggleItem,
  onUpdateNote,
}: {
  item: LibraryReleaseApprovalItem;
  onToggleItem: (itemId: string) => void;
  onUpdateNote: (itemId: string, note: string) => void;
}) {
  return (
    <div className="rounded-sm bg-background px-2 py-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-medium">{item.label}</div>
          <div className="truncate text-[10px] text-muted-foreground">
            {item.detail}
          </div>
        </div>
        <Badge
          variant={item.acknowledged ? "secondary" : "outline"}
          className="shrink-0 capitalize"
        >
          {item.severity}
        </Badge>
      </div>
      <Button
        type="button"
        size="sm"
        variant={item.acknowledged ? "secondary" : "ghost"}
        className="mt-1 h-6 w-full gap-1 px-2 text-[11px]"
        onClick={() => onToggleItem(item.id)}
      >
        <CheckCircle2 className="size-3" />
        {item.acknowledged ? "Acknowledged" : "Acknowledge"}
      </Button>
      <Input
        value={item.note ?? ""}
        placeholder="Approval note"
        className="mt-1 h-7 px-2 text-[11px]"
        onChange={(event) => onUpdateNote(item.id, event.target.value)}
      />
    </div>
  );
}

function ReleaseApprovalSnapshotRow({
  snapshot,
  onRestoreSnapshot,
}: {
  snapshot: LibraryReleaseApprovalSnapshot;
  onRestoreSnapshot: (snapshot: LibraryReleaseApprovalSnapshot) => void;
}) {
  return (
    <div className="rounded-sm bg-background px-2 py-1.5 text-[11px]">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-medium">{snapshot.label}</span>
        <Badge
          variant={snapshot.outstandingCount > 0 ? "outline" : "secondary"}
          className="shrink-0"
        >
          {snapshot.acknowledgedCount}/{snapshot.itemCount}
        </Badge>
      </div>
      <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
        {new Date(snapshot.createdAt).toLocaleString()} / ready{" "}
        {snapshot.readinessScore} / risk {snapshot.riskScore} / notes{" "}
        {Object.keys(snapshot.notes).length}
      </div>
      {(snapshot.reviewOwner || snapshot.reviewerNote) ? (
        <div className="mt-1 truncate text-[10px] text-muted-foreground">
          {snapshot.reviewOwner ?? "Unassigned"} /{" "}
          {snapshot.reviewerNote ?? "No reviewer note"}
        </div>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="mt-1 h-6 w-full gap-1 px-2 text-[11px]"
        onClick={() => onRestoreSnapshot(snapshot)}
      >
        <RotateCcw className="size-3" />
        Restore snapshot
      </Button>
    </div>
  );
}

const approvalReviewFilters = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "acknowledged", label: "Ack" },
  { id: "readiness", label: "Ready" },
  { id: "risk", label: "Risk" },
] as const satisfies ReadonlyArray<{
  id: ApprovalReviewFilter;
  label: string;
}>;

function exportApprovalSnapshotsCsv(
  snapshots: LibraryReleaseApprovalSnapshot[],
) {
  downloadTextFile({
    content: getLibraryReleaseApprovalSnapshotsCsv(snapshots),
    filename: "release-approval-snapshots.csv",
    type: "text/csv;charset=utf-8",
  });
}

function matchesApprovalReviewFilter(
  item: LibraryReleaseApprovalItem,
  filter: ApprovalReviewFilter,
) {
  if (filter === "all") {
    return true;
  }

  if (filter === "open") {
    return !item.acknowledged;
  }

  if (filter === "acknowledged") {
    return item.acknowledged;
  }

  if (filter === "readiness") {
    return item.source === "readiness";
  }

  return item.source === "risk";
}
