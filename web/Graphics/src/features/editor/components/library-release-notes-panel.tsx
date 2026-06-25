"use client";

import { useState } from "react";
import { Copy, Download, PackageCheck, PackageOpen, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  downloadTextFile,
  ReadinessMetric,
  toFilename,
} from "@/features/editor/components/library-release-panel-shared";
import { getLibraryAuditHandoffMarkdown } from "@/features/editor/library-audit-handoff";
import type { LibraryReleaseApprovalReport } from "@/features/editor/library-release-approval";
import type {
  LibraryReleaseArchive,
  LibraryReleaseArchiveComparison,
  LibraryReleaseArchiveImportSummary,
  LibraryReleaseArchiveVerification,
} from "@/features/editor/library-release-archive";
import {
  compareLibraryReleaseArchives,
  getLibraryReleaseArchiveImportSummary,
  verifyLibraryReleaseArchiveIntegrity,
} from "@/features/editor/library-release-archive";
import type { LibraryReleaseNotesReport } from "@/features/editor/library-release-notes";
import type { LibraryReleaseReplayItem } from "@/features/editor/library-release-replay";
import {
  getLibraryReleaseReplayChecklistCsv,
  getLibraryReleaseReplaySummary,
} from "@/features/editor/library-release-replay";

type ReplayChecklistFilter = "all" | "ready" | "review" | "missing";

export function LibraryReleaseNotesPanel({
  report,
  archive,
  archiveComparison,
  archiveImportSummary,
  archiveVerification,
  importedApproval,
  replayChecklist,
  onRestoreImportedApproval,
  onVerifyArchive,
}: {
  report: LibraryReleaseNotesReport;
  archive: LibraryReleaseArchive;
  archiveComparison: LibraryReleaseArchiveComparison | null;
  archiveImportSummary: LibraryReleaseArchiveImportSummary | null;
  archiveVerification: LibraryReleaseArchiveVerification | null;
  importedApproval: LibraryReleaseApprovalReport | null;
  replayChecklist: LibraryReleaseReplayItem[];
  onRestoreImportedApproval: (approval: LibraryReleaseApprovalReport) => void;
  onVerifyArchive: () => void;
}) {
  return (
    <div className="space-y-2 rounded-sm border border-border/70 bg-muted/20 p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-medium">Release notes</div>
          <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {report.summary}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-1.5 text-xs"
            onClick={() => void navigator.clipboard.writeText(report.notes)}
          >
            <Copy className="size-3.5" />
            Copy
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-1.5 text-xs"
            onClick={() => exportReleaseArchive(archive)}
          >
            <Download className="size-3.5" />
            Archive
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-1.5 text-xs"
            onClick={onVerifyArchive}
          >
            <PackageCheck className="size-3.5" />
            Verify
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-1.5 text-xs"
            onClick={() => exportAuditHandoff(archive)}
          >
            <PackageOpen className="size-3.5" />
            Inspect
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <ReadinessMetric label="Blockers" value={report.blockerCount} />
        <ReadinessMetric label="Review" value={report.reviewCount} />
        <ReadinessMetric
          label="Lines"
          value={report.notes.split("\n").length}
        />
      </div>
      <div className="line-clamp-3 rounded-sm bg-background p-2 text-[11px] text-muted-foreground">
        {report.title} / {report.subtitle}
      </div>
      {archiveVerification ? (
        <div className="rounded-sm bg-background p-2 text-[11px] text-muted-foreground">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">{archiveVerification.detail}</span>
            <Badge
              variant={archiveVerification.valid ? "secondary" : "outline"}
              className="shrink-0"
            >
              {archiveVerification.valid ? "Verified" : "Mismatch"}
            </Badge>
          </div>
          <div className="mt-1 truncate font-mono text-[10px]">
            {archiveVerification.actualHash}
          </div>
        </div>
      ) : null}
      {archiveImportSummary ? (
        <ReleaseArchiveImportSummaryCard
          summary={archiveImportSummary}
          importedApproval={importedApproval}
          onRestoreImportedApproval={onRestoreImportedApproval}
        />
      ) : null}
      <ReleaseReplayChecklist items={replayChecklist} />
      {archiveComparison ? (
        <div className="grid grid-cols-3 gap-1.5">
          <ReadinessMetric
            label="Components"
            value={archiveComparison.componentDelta}
          />
          <ReadinessMetric
            label="Ready"
            value={archiveComparison.readinessDelta}
          />
          <ReadinessMetric label="Risk" value={archiveComparison.riskDelta} />
        </div>
      ) : null}
      {archiveComparison ? (
        <div className="rounded-sm bg-background p-2 text-[11px] text-muted-foreground">
          <div className="truncate">{archiveComparison.detail}</div>
          <div className="mt-1 truncate font-mono text-[10px]">
            +{archiveComparison.currentOnlyCount} current / -
            {archiveComparison.archivedOnlyCount} archived / version{" "}
            {archiveComparison.versionChanged ? "changed" : "same"}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export async function verifyArchiveFile(
  file: File,
  currentArchive: LibraryReleaseArchive,
  onResult: (result: LibraryReleaseArchiveVerification) => void,
  onCompare: (result: LibraryReleaseArchiveComparison | null) => void,
  onSummary: (result: LibraryReleaseArchiveImportSummary | null) => void,
  onApproval: (result: LibraryReleaseApprovalReport | null) => void,
) {
  try {
    const archive = JSON.parse(await file.text()) as LibraryReleaseArchive;
    onResult(verifyLibraryReleaseArchiveIntegrity(archive));
    onCompare(compareLibraryReleaseArchives(currentArchive, archive));
    onSummary(getLibraryReleaseArchiveImportSummary(archive));
    onApproval(archive.reports.releaseApproval ?? null);
  } catch {
    onCompare(null);
    onSummary(null);
    onApproval(null);
    onResult({
      valid: false,
      expectedHash: "unknown",
      actualHash: "parse-error",
      detail: "The selected file is not valid release archive JSON.",
    });
  }
}

function ReleaseArchiveImportSummaryCard({
  summary,
  importedApproval,
  onRestoreImportedApproval,
}: {
  summary: LibraryReleaseArchiveImportSummary;
  importedApproval: LibraryReleaseApprovalReport | null;
  onRestoreImportedApproval: (approval: LibraryReleaseApprovalReport) => void;
}) {
  return (
    <div className="space-y-1 rounded-sm bg-background p-2 text-[11px] text-muted-foreground">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-medium text-foreground">
          {summary.libraryName} v{summary.targetVersion}
        </span>
        <Badge variant={summary.approvalOpenCount > 0 ? "outline" : "secondary"}>
          {summary.componentCount} components
        </Badge>
      </div>
      <div className="truncate font-mono text-[10px]">
        {summary.teamName} / {summary.payloadHash} /{" "}
        {new Date(summary.exportedAt).toLocaleString()}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        <ReadinessMetric label="Rows" value={summary.reportRowCount} />
        <ReadinessMetric label="Ready" value={summary.readinessScore} />
        <ReadinessMetric label="Risk" value={summary.riskScore} />
        <ReadinessMetric label="Open" value={summary.approvalOpenCount} />
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-6 w-full gap-1 px-2 text-[11px]"
        onClick={() =>
          void navigator.clipboard.writeText(getArchiveSummaryText(summary))
        }
      >
        <Copy className="size-3" />
        Copy archive summary
      </Button>
      {importedApproval ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 w-full gap-1 px-2 text-[11px]"
          onClick={() => onRestoreImportedApproval(importedApproval)}
        >
          <RotateCcw className="size-3" />
          Restore archive approval
        </Button>
      ) : null}
    </div>
  );
}

function getArchiveSummaryText(summary: LibraryReleaseArchiveImportSummary) {
  return [
    `${summary.libraryName} v${summary.targetVersion}`,
    `Team: ${summary.teamName}`,
    `Exported: ${summary.exportedAt}`,
    `Hash: ${summary.payloadHash}`,
    `Components: ${summary.componentCount}`,
    `Rows: ${summary.reportRowCount}`,
    `Readiness: ${summary.readinessScore}`,
    `Risk: ${summary.riskScore}`,
    `Open approvals: ${summary.approvalOpenCount}`,
  ].join("\n");
}

function ReleaseReplayChecklist({ items }: { items: LibraryReleaseReplayItem[] }) {
  const [filter, setFilter] = useState<ReplayChecklistFilter>("all");
  const summary = getLibraryReleaseReplaySummary(items);
  const filteredItems = items.filter((item) =>
    filter === "all" ? true : item.status === filter,
  );

  return (
    <div className="space-y-1 rounded-sm bg-background p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-medium">Archive replay</div>
        <div className="flex shrink-0 items-center gap-1">
          <Badge variant="secondary">{summary.readyCount} ready</Badge>
          <Badge variant={summary.reviewCount > 0 ? "outline" : "secondary"}>
            {summary.reviewCount} review
          </Badge>
          <Badge variant={summary.missingCount > 0 ? "outline" : "secondary"}>
            {summary.missingCount} missing
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 gap-1 px-1.5 text-[11px]"
            onClick={() => exportReplayChecklistCsv(items)}
          >
            <Download className="size-3" />
            CSV
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 rounded-sm bg-muted/30 p-1">
        {replayChecklistFilters.map((item) => (
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
      {filteredItems.map((item) => (
        <div
          key={item.id}
          className="flex items-start justify-between gap-2 text-[11px]"
        >
          <div className="min-w-0">
            <div className="truncate text-foreground">{item.label}</div>
            <div className="truncate text-[10px] text-muted-foreground">
              {item.detail}
            </div>
          </div>
          <Badge
            variant={item.status === "ready" ? "secondary" : "outline"}
            className="shrink-0 capitalize"
          >
            {item.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}

const replayChecklistFilters = [
  { id: "all", label: "All" },
  { id: "ready", label: "Ready" },
  { id: "review", label: "Review" },
  { id: "missing", label: "Missing" },
] as const satisfies ReadonlyArray<{
  id: ReplayChecklistFilter;
  label: string;
}>;

function exportReplayChecklistCsv(items: LibraryReleaseReplayItem[]) {
  downloadTextFile({
    content: getLibraryReleaseReplayChecklistCsv(items),
    filename: "release-archive-replay-checklist.csv",
    type: "text/csv;charset=utf-8",
  });
}

function exportAuditHandoff(archive: LibraryReleaseArchive) {
  downloadTextFile({
    content: getLibraryAuditHandoffMarkdown(archive),
    filename: `${toFilename(archive.library.name)}-v${archive.library.targetVersion}-audit-handoff.md`,
    type: "text/markdown;charset=utf-8",
  });
}

function exportReleaseArchive(archive: LibraryReleaseArchive) {
  downloadTextFile({
    content: JSON.stringify(archive, null, 2),
    filename: `${toFilename(archive.library.name)}-v${archive.library.targetVersion}-release-archive.json`,
    type: "application/json;charset=utf-8",
  });
}
