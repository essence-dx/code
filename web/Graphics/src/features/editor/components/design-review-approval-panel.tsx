"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileJson2,
  MousePointer2,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DesignReviewFilterButton,
  DesignReviewMetric,
  DesignReviewRowCard,
  designReviewApprovalFilters,
  getDesignReviewStatusVariant,
  getVisibleDesignReviewRows,
  type DesignReviewApprovalFilter,
} from "@/features/editor/components/design-review-approval-panel-utils";
import {
  getDesignReviewApprovalBundleJson,
  getDesignReviewApprovalCsv,
  getDesignReviewApprovalMarkdown,
} from "@/features/editor/design-review-approval-export";
import type {
  DesignComment,
  DesignLayer,
} from "@/features/editor/types";
import type { DesignReviewApprovalReport } from "@/features/editor/design-review-approval-types";
import type { LayerPatch } from "@/features/editor/document-utils";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type ReviewCommentPatch = Partial<
  Pick<
    DesignComment,
    "resolved" | "assigneeName" | "assigneeEmail" | "dueDate"
  >
>;

type DesignReviewApprovalPanelProps = {
  report: DesignReviewApprovalReport;
  onRecordActivity?: (label: string, detail?: string) => void;
  onSelectLayers: (layerIds: string[]) => void;
  onUpdateComments: (commentIds: string[], patch: ReviewCommentPatch) => void;
  onUpdateLayers: (patches: LayerPatch[]) => void;
};

export function DesignReviewApprovalPanel({
  report,
  onRecordActivity,
  onSelectLayers,
  onUpdateComments,
  onUpdateLayers,
}: DesignReviewApprovalPanelProps) {
  const [filter, setFilter] = useState<DesignReviewApprovalFilter>("all");
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [dueDate, setDueDate] = useState("");
  const visibleRows = useMemo(
    () => getVisibleDesignReviewRows(report.rows, filter),
    [filter, report.rows],
  );
  const activeRow =
    report.rows.find((row) => row.id === activeRowId) ?? visibleRows[0] ?? null;
  const selectableLayerIds = useMemo(
    () =>
      Array.from(
        new Set(visibleRows.flatMap((row) => row.layerIds).filter(Boolean)),
      ),
    [visibleRows],
  );
  const selectableCommentIds = useMemo(
    () =>
      Array.from(
        new Set(visibleRows.flatMap((row) => row.commentIds).filter(Boolean)),
      ),
    [visibleRows],
  );

  function exportCsv() {
    downloadTextFile({
      content: getDesignReviewApprovalCsv(report, visibleRows),
      filename: `design-review-approval-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported design review approval CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getDesignReviewApprovalMarkdown(report, visibleRows),
      filename: `design-review-approval-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported design review approval handoff",
      `${visibleRows.length} rows`,
    );
  }

  function exportJson() {
    downloadTextFile({
      content: getDesignReviewApprovalBundleJson(report, visibleRows),
      filename: `design-review-approval-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported design review approval bundle",
      `${visibleRows.length} rows`,
    );
  }

  function selectQueue() {
    onSelectLayers(selectableLayerIds);
    onRecordActivity?.(
      "Selected design review queue",
      `${selectableLayerIds.length} layers / ${selectableCommentIds.length} comments`,
    );
  }

  function assignReviewers() {
    if (!activeRow || activeRow.commentIds.length === 0) {
      return;
    }

    const patch: ReviewCommentPatch = {
      assigneeName: reviewerName.trim() || "Reviewer",
      assigneeEmail: reviewerEmail.trim() || null,
      dueDate: dueDate.trim() || null,
    };

    onUpdateComments(activeRow.commentIds, patch);
    onRecordActivity?.(
      "Assigned design review owner",
      `${activeRow.commentIds.length} comment${activeRow.commentIds.length === 1 ? "" : "s"}`,
    );
  }

  function resolveActiveComments() {
    if (!activeRow || activeRow.commentIds.length === 0) {
      return;
    }

    onUpdateComments(activeRow.commentIds, { resolved: true });
    onRecordActivity?.(
      "Approved design review comments",
      `${activeRow.commentIds.length} comment${activeRow.commentIds.length === 1 ? "" : "s"}`,
    );
  }

  function markActiveLayersReady() {
    if (!activeRow || activeRow.layerIds.length === 0) {
      return;
    }

    onUpdateLayers(
      activeRow.layerIds.map((layerId) => ({
        layerId,
        patch: { readyForDev: true } satisfies Partial<DesignLayer>,
      })),
    );
    onRecordActivity?.(
      "Marked design review layers ready",
      `${activeRow.layerIds.length} layer${activeRow.layerIds.length === 1 ? "" : "s"}`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <UserCheck className="size-3.5" />
            Design review approval
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Reviewer ownership, due dates, comment approval queues, evidence
            bundles, and release-gate blockers.
          </div>
        </div>
        <Badge variant={getDesignReviewStatusVariant(report.status)}>
          {report.score}
        </Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <DesignReviewMetric label="Open" value={report.openCommentCount} />
        <DesignReviewMetric label="Assigned" value={report.assignedCommentCount} />
        <DesignReviewMetric label="Overdue" value={report.overdueCommentCount} />
        <DesignReviewMetric label="Gates" value={report.blockedGateCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <DesignReviewMetric label="Owners" value={report.approverCount} />
        <DesignReviewMetric label="Due soon" value={report.dueSoonCommentCount} />
        <DesignReviewMetric label="Ready" value={report.readyForDevLayerCount} />
        <DesignReviewMetric label="Evidence" value={report.evidenceCount} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {designReviewApprovalFilters.map((item) => (
          <DesignReviewFilterButton
            key={item.id}
            active={filter === item.id}
            label={item.label}
            onClick={() => setFilter(item.id)}
          />
        ))}
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={visibleRows.length === 0}
          onClick={exportCsv}
        >
          <Download className="size-3" />
          CSV
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={visibleRows.length === 0}
          onClick={exportMarkdown}
        >
          MD
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={visibleRows.length === 0}
          onClick={exportJson}
        >
          <FileJson2 className="size-3" />
          JSON
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={selectableLayerIds.length === 0}
          onClick={selectQueue}
        >
          <MousePointer2 className="size-3" />
          Select
        </Button>
      </div>

      <div className="mt-2 space-y-1">
        {visibleRows.slice(0, 6).map((row) => (
          <DesignReviewRowCard
            key={row.id}
            active={activeRow?.id === row.id}
            row={row}
            onClick={() => setActiveRowId(row.id)}
          />
        ))}
        {visibleRows.length > 6 ? (
          <div className="rounded-sm bg-muted px-2 py-1 text-[10px] text-muted-foreground">
            {visibleRows.length - 6} more design review item
            {visibleRows.length - 6 === 1 ? "" : "s"}
          </div>
        ) : null}
      </div>

      {activeRow ? (
        <div className="mt-2 rounded-sm border border-dashed border-border p-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[11px] font-medium">
                {activeRow.label}
              </div>
              <div className="truncate text-[10px] text-muted-foreground">
                {activeRow.commentIds.length} comments /{" "}
                {activeRow.layerIds.length} layers
              </div>
            </div>
            <Badge variant={getDesignReviewStatusVariant(activeRow.status)}>
              {activeRow.category}
            </Badge>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <Input
              className="h-8 text-[11px]"
              placeholder="Reviewer name"
              value={reviewerName}
              onChange={(event) => setReviewerName(event.target.value)}
            />
            <Input
              className="h-8 text-[11px]"
              placeholder="reviewer@example.com"
              value={reviewerEmail}
              onChange={(event) => setReviewerEmail(event.target.value)}
            />
          </div>
          <Input
            className="mt-1.5 h-8 text-[11px]"
            placeholder="Due date YYYY-MM-DD"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />

          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 px-2 text-[11px]"
              disabled={activeRow.commentIds.length === 0}
              onClick={assignReviewers}
            >
              <UserCheck className="size-3" />
              Assign
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 px-2 text-[11px]"
              disabled={activeRow.commentIds.length === 0}
              onClick={resolveActiveComments}
            >
              <CheckCircle2 className="size-3" />
              Approve
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 px-2 text-[11px]"
              disabled={activeRow.layerIds.length === 0}
              onClick={markActiveLayersReady}
            >
              Ready
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
