"use client";

import { useMemo, useState } from "react";
import {
  ClipboardCopy,
  Download,
  Link2Off,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getShareLinkReview,
  getShareLinkReviewCsv,
  getShareLinkReviewMarkdown,
  type ShareLinkReviewRow,
  type ShareLinkReviewStatus,
} from "@/features/editor/share-link-review";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import type { DesignFileShareSummary } from "@/features/files/actions";
import { cn } from "@/lib/utils";

type ShareLinkReviewPanelProps = {
  isPending: boolean;
  onDisableShare: (shareId: string) => void;
  onRecordActivity?: (label: string, detail?: string) => void;
  onSetShareExpiry: (shareId: string, expiresInDays: number | null) => void;
  shares: DesignFileShareSummary[];
};

type ShareLinkFilter = "all" | "blocked" | "review" | "ready";

export function ShareLinkReviewPanel({
  isPending,
  onDisableShare,
  onRecordActivity,
  onSetShareExpiry,
  shares,
}: ShareLinkReviewPanelProps) {
  const [filter, setFilter] = useState<ShareLinkFilter>("all");
  const report = useMemo(() => getShareLinkReview({ shares }), [shares]);
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter),
    [filter, report.rows],
  );
  const activeShares = shares.filter((share) => !share.disabledAt);
  const previewRows = visibleRows.slice(0, 3);

  function exportCsv() {
    downloadTextFile({
      content: getShareLinkReviewCsv(report, visibleRows),
      filename: `share-link-review-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported share link CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getShareLinkReviewMarkdown(report, visibleRows),
      filename: `share-link-review-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported share link review",
      `${visibleRows.length} rows`,
    );
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getShareLinkReviewMarkdown(report, visibleRows),
    );
    onRecordActivity?.(
      "Copied share link review",
      `${visibleRows.length} rows`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {report.blockedCount > 0 ? (
              <ShieldAlert className="size-3.5" />
            ) : (
              <ShieldCheck className="size-3.5" />
            )}
            Link review
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Downloads, comments, stale links, and audit history.
          </div>
        </div>
        <Badge variant={report.blockedCount > 0 ? "destructive" : "secondary"}>
          {report.score}
        </Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Active" value={report.activeShareCount} />
        <Metric label="Down" value={report.downloadShareCount} />
        <Metric label="Review" value={report.commentShareCount} />
        <Metric label="Stale" value={report.staleShareCount} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {filters.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={filter === item.id ? "secondary" : "ghost"}
            className="h-7 px-2 text-[11px]"
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={visibleRows.length === 0}
          onClick={exportCsv}
        >
          <Download className="mr-1 size-3" />
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
          onClick={copyMarkdown}
        >
          <ClipboardCopy className="mr-1 size-3" />
          Copy
        </Button>
      </div>

      <div className="mt-2 space-y-1">
        {activeShares.map((share) => (
          <div
            key={share.id}
            className="flex items-center justify-between gap-2 rounded-sm bg-muted px-2 py-1 text-[11px]"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">
                {share.permissionPreset}
              </span>
              <span className="block truncate text-muted-foreground">
                {share.allowDownload ? "download" : share.accessLevel}
                {share.allowComments ? " / comments" : ""}
                {share.expiresAt ? ` / exp ${formatShareDate(share.expiresAt)}` : " / no expiry"}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-1.5 text-[10px]"
                disabled={isPending}
                onClick={() => onSetShareExpiry(share.id, 7)}
              >
                7d
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-1.5 text-[10px]"
                disabled={isPending}
                onClick={() => onSetShareExpiry(share.id, 30)}
              >
                30d
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-1.5 text-[10px]"
                disabled={isPending || !share.expiresAt}
                aria-label={`Clear ${share.permissionPreset} expiry`}
                onClick={() => onSetShareExpiry(share.id, null)}
              >
                Clear
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-6"
                disabled={isPending}
                aria-label={`Disable ${share.permissionPreset} link`}
                onClick={() => onDisableShare(share.id)}
              >
                <Link2Off className="size-3.5" />
              </Button>
            </span>
          </div>
        ))}
        {previewRows.map((row) => (
          <ReviewRow key={row.id} row={row} />
        ))}
      </div>
    </div>
  );
}

const filters = [
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "ready", label: "Ready" },
] as const satisfies ReadonlyArray<{
  id: ShareLinkFilter;
  label: string;
}>;

function ReviewRow({ row }: { row: ShareLinkReviewRow }) {
  return (
    <div
      className={cn(
        "rounded-sm border px-2 py-1.5",
        row.status === "blocked" && "border-destructive/60",
        row.status === "review" && "border-amber-400/70",
        row.status === "ready" && "border-border",
      )}
    >
      <div className="flex items-center gap-2">
        <Badge
          variant={getStatusVariant(row.status)}
          className="h-5 shrink-0 px-1.5 text-[10px]"
        >
          {row.status}
        </Badge>
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
          {row.label}
        </span>
        <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {row.count}
        </span>
      </div>
      <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
        {row.detail}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted px-2 py-1">
      <div>{label}</div>
      <div className="text-xs text-foreground">{value}</div>
    </div>
  );
}

function getVisibleRows(
  rows: ShareLinkReviewRow[],
  filter: ShareLinkFilter,
) {
  if (filter === "all") {
    return rows;
  }

  return rows.filter((row) => row.status === filter);
}

function getStatusVariant(status: ShareLinkReviewStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}

function formatShareDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
