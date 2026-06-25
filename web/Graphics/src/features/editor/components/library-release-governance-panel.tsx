"use client";

import { useState } from "react";
import { Copy, Download, PackageOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  downloadTextFile,
  ReadinessMetric,
  toFilename,
} from "@/features/editor/components/library-release-panel-shared";
import type { LibraryPublishReadinessReport } from "@/features/editor/library-publish-readiness";
import type { LibraryPublishRiskReport } from "@/features/editor/library-publish-risk";
import type { LibraryReleaseApprovalReport } from "@/features/editor/library-release-approval";
import type { LibraryReleaseArchive } from "@/features/editor/library-release-archive";
import type { LibraryReleaseEvidenceSummary } from "@/features/editor/library-release-evidence";
import {
  getLibraryReleaseEvidenceCsv,
  getLibraryReleaseEvidenceMarkdown,
} from "@/features/editor/library-release-evidence";
import { getLibraryReleaseEvidenceBundleJson } from "@/features/editor/library-release-evidence-bundle";
import { getLibraryReleaseGovernanceCsv } from "@/features/editor/library-release-governance";
import type { LibraryReleaseGovernanceWarning } from "@/features/editor/library-release-governance-review";
import {
  getLibraryReleaseGovernanceWarningsCsv,
  getLibraryReleaseGovernanceWarningsText,
} from "@/features/editor/library-release-governance-review";
import type { LibraryReleaseReplayItem } from "@/features/editor/library-release-replay";
import type { LibraryReleaseSearchResult } from "@/features/editor/library-release-search";

type GovernanceWarningFilter = "all" | "blockers" | "warnings" | "open";

export function LibraryReleaseGovernancePanel({
  archive,
  approval,
  evidence,
  readiness,
  replayItems,
  risk,
  searchResults,
  warnings,
}: {
  archive: LibraryReleaseArchive;
  approval: LibraryReleaseApprovalReport;
  evidence: LibraryReleaseEvidenceSummary;
  readiness: LibraryPublishReadinessReport;
  replayItems: LibraryReleaseReplayItem[];
  risk: LibraryPublishRiskReport;
  searchResults: LibraryReleaseSearchResult[];
  warnings: LibraryReleaseGovernanceWarning[];
}) {
  const [warningFilter, setWarningFilter] =
    useState<GovernanceWarningFilter>("all");
  const filteredWarnings = warnings.filter((warning) =>
    matchesGovernanceWarningFilter(warning, warningFilter),
  );

  return (
    <div className="space-y-2 rounded-sm border border-border/70 bg-muted/20 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">Governance summary</span>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge
            variant={
              approval.canApprove && readiness.canPublish
                ? "secondary"
                : "outline"
            }
          >
            {archive.integrity.payloadHash}
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 gap-1 px-1.5 text-[11px]"
            onClick={() =>
              exportEvidenceBundle({
                archive,
                approval,
                evidence,
                readiness,
                replayItems,
                risk,
                searchResults,
                warnings,
              })
            }
          >
            <PackageOpen className="size-3" />
            Bundle
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 gap-1 px-1.5 text-[11px]"
            onClick={() =>
              exportGovernanceCsv({ archive, approval, readiness, risk })
            }
          >
            <Download className="size-3" />
            CSV
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        <ReadinessMetric label="Ready" value={readiness.score} />
        <ReadinessMetric label="Open" value={approval.outstandingCount} />
        <ReadinessMetric label="Risk" value={risk.score} />
        <ReadinessMetric
          label="Rows"
          value={archive.integrity.reportRowCount}
        />
      </div>
      <div className="grid grid-cols-2 gap-1.5 text-[10px] text-muted-foreground">
        <div className="truncate rounded-sm bg-background px-2 py-1">
          {readiness.label} / {readiness.blockedCount} blocked
        </div>
        <div className="truncate rounded-sm bg-background px-2 py-1">
          {risk.label} / {risk.highCount} high risk
        </div>
      </div>
      <ReleaseEvidenceCard evidence={evidence} />
      {warnings.length > 0 ? (
        <div className="flex items-center justify-between gap-2 rounded-sm bg-background p-1">
          <div className="flex flex-wrap gap-1">
            {governanceWarningFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                className={
                  warningFilter === item.id
                    ? "rounded-sm bg-secondary px-2 py-1 text-[11px] text-secondary-foreground"
                    : "rounded-sm px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
                }
                onClick={() => setWarningFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 gap-1 px-1.5 text-[11px]"
              disabled={filteredWarnings.length === 0}
              onClick={() =>
                void navigator.clipboard.writeText(
                  getLibraryReleaseGovernanceWarningsText(filteredWarnings),
                )
              }
            >
              <Copy className="size-3" />
              Copy
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 gap-1 px-1.5 text-[11px]"
              disabled={filteredWarnings.length === 0}
              onClick={() => exportGovernanceWarningsCsv(filteredWarnings)}
            >
              <Download className="size-3" />
              CSV
            </Button>
          </div>
        </div>
      ) : null}
      {filteredWarnings.length > 0 ? (
        <div className="space-y-1">
          {filteredWarnings.map((warning) => (
            <div
              key={warning.id}
              className="rounded-sm bg-background px-2 py-1.5 text-[11px]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-medium">
                  {warning.label}
                </span>
                <Badge
                  variant={
                    warning.severity === "blocker" ? "outline" : "secondary"
                  }
                  className="shrink-0 capitalize"
                >
                  {warning.severity}
                </Badge>
              </div>
              <div className="mt-1 truncate text-[10px] text-muted-foreground">
                {warning.detail}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const governanceWarningFilters = [
  { id: "all", label: "All" },
  { id: "blockers", label: "Blockers" },
  { id: "warnings", label: "Warnings" },
  { id: "open", label: "Open" },
] as const satisfies ReadonlyArray<{
  id: GovernanceWarningFilter;
  label: string;
}>;

function matchesGovernanceWarningFilter(
  warning: LibraryReleaseGovernanceWarning,
  filter: GovernanceWarningFilter,
) {
  if (filter === "all") {
    return true;
  }

  if (filter === "blockers") {
    return warning.severity === "blocker";
  }

  if (filter === "warnings") {
    return warning.severity === "warning";
  }

  return warning.id === "approval-open";
}

function exportGovernanceWarningsCsv(
  warnings: LibraryReleaseGovernanceWarning[],
) {
  downloadTextFile({
    content: getLibraryReleaseGovernanceWarningsCsv(warnings),
    filename: "release-governance-warnings.csv",
    type: "text/csv;charset=utf-8",
  });
}

function ReleaseEvidenceCard({
  evidence,
}: {
  evidence: LibraryReleaseEvidenceSummary;
}) {
  return (
    <div className="rounded-sm bg-background p-2 text-[11px] text-muted-foreground">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-medium text-foreground">
          {evidence.title}
        </span>
        <Badge
          variant={evidence.status === "ready" ? "secondary" : "outline"}
          className="shrink-0 capitalize"
        >
          {evidence.status}
        </Badge>
      </div>
      <div className="mt-1 truncate text-[10px]">{evidence.summary}</div>
      <div className="mt-2 flex gap-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 flex-1 gap-1 px-2 text-[11px]"
          onClick={() =>
            void navigator.clipboard.writeText(
              getLibraryReleaseEvidenceMarkdown(evidence),
            )
          }
        >
          <Copy className="size-3" />
          Copy
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 flex-1 gap-1 px-2 text-[11px]"
          onClick={() => exportEvidenceMarkdown(evidence)}
        >
          <Download className="size-3" />
          Download
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 flex-1 gap-1 px-2 text-[11px]"
          onClick={() => exportEvidenceCsv(evidence)}
        >
          <Download className="size-3" />
          CSV
        </Button>
      </div>
    </div>
  );
}

function exportEvidenceCsv(evidence: LibraryReleaseEvidenceSummary) {
  downloadTextFile({
    content: getLibraryReleaseEvidenceCsv(evidence),
    filename: `${toFilename(evidence.title)}.csv`,
    type: "text/csv;charset=utf-8",
  });
}

function exportEvidenceMarkdown(evidence: LibraryReleaseEvidenceSummary) {
  downloadTextFile({
    content: getLibraryReleaseEvidenceMarkdown(evidence),
    filename: `${toFilename(evidence.title)}.md`,
    type: "text/markdown;charset=utf-8",
  });
}

function exportEvidenceBundle({
  archive,
  approval,
  evidence,
  readiness,
  replayItems,
  risk,
  searchResults,
  warnings,
}: {
  archive: LibraryReleaseArchive;
  approval: LibraryReleaseApprovalReport;
  evidence: LibraryReleaseEvidenceSummary;
  readiness: LibraryPublishReadinessReport;
  replayItems: LibraryReleaseReplayItem[];
  risk: LibraryPublishRiskReport;
  searchResults: LibraryReleaseSearchResult[];
  warnings: LibraryReleaseGovernanceWarning[];
}) {
  downloadTextFile({
    content: getLibraryReleaseEvidenceBundleJson({
      archive,
      approval,
      evidence,
      readiness,
      replayItems,
      risk,
      searchResults,
      warnings,
    }),
    filename: `${toFilename(archive.library.name)}-v${archive.library.targetVersion}-evidence-bundle.json`,
    type: "application/json;charset=utf-8",
  });
}

function exportGovernanceCsv({
  archive,
  approval,
  readiness,
  risk,
}: {
  archive: LibraryReleaseArchive;
  approval: LibraryReleaseApprovalReport;
  readiness: LibraryPublishReadinessReport;
  risk: LibraryPublishRiskReport;
}) {
  downloadTextFile({
    content: getLibraryReleaseGovernanceCsv({
      archive,
      approval,
      readiness,
      risk,
    }),
    filename: `${toFilename(archive.library.name)}-v${archive.library.targetVersion}-governance.csv`,
    type: "text/csv;charset=utf-8",
  });
}
