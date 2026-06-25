import type { LibraryReleaseApprovalReport } from "@/features/editor/library-release-approval";
import type {
  LibraryReleaseArchive,
  LibraryReleaseArchiveComparison,
  LibraryReleaseArchiveVerification,
} from "@/features/editor/library-release-archive";
import type { LibraryReleaseGovernanceWarning } from "@/features/editor/library-release-governance-review";

export type LibraryReleaseEvidenceSummary = {
  title: string;
  status: "ready" | "review" | "blocked";
  summary: string;
  lines: string[];
};

export function getLibraryReleaseEvidenceSummary({
  approval,
  archive,
  archiveComparison,
  archiveVerification,
  warnings,
}: {
  approval: LibraryReleaseApprovalReport;
  archive: LibraryReleaseArchive;
  archiveComparison: LibraryReleaseArchiveComparison | null;
  archiveVerification: LibraryReleaseArchiveVerification | null;
  warnings: LibraryReleaseGovernanceWarning[];
}): LibraryReleaseEvidenceSummary {
  const blockerCount = warnings.filter(
    (warning) => warning.severity === "blocker",
  ).length;
  const status =
    blockerCount > 0
      ? "blocked"
      : approval.outstandingCount > 0 || warnings.length > 0
        ? "review"
        : "ready";
  const lines = [
    `Library: ${archive.library.name} v${archive.library.targetVersion}`,
    `Integrity: ${archive.integrity.payloadHash} (${archive.integrity.algorithm})`,
    `Approval: ${approval.acknowledgedCount}/${approval.itemCount} acknowledged, ${approval.outstandingCount} open`,
    `Warnings: ${warnings.length} total, ${blockerCount} blockers`,
    `Verification: ${archiveVerification ? archiveVerification.detail : "No imported archive verified yet."}`,
    `Comparison: ${archiveComparison ? archiveComparison.detail : "No imported archive compared yet."}`,
  ];

  return {
    title: `${archive.library.name} v${archive.library.targetVersion} evidence`,
    status,
    summary: `${status} / ${approval.outstandingCount} open approvals / ${warnings.length} governance warnings`,
    lines,
  };
}

export function getLibraryReleaseEvidenceMarkdown(
  evidence: LibraryReleaseEvidenceSummary,
) {
  return [
    `# ${evidence.title}`,
    "",
    `Status: ${evidence.status}`,
    `Summary: ${evidence.summary}`,
    "",
    "## Evidence",
    ...evidence.lines.map((line) => `- ${line}`),
  ].join("\n");
}

export function getLibraryReleaseEvidenceCsv(
  evidence: LibraryReleaseEvidenceSummary,
) {
  return [
    "section,key,value",
    ["summary", "title", evidence.title].map(escapeCsvCell).join(","),
    ["summary", "status", evidence.status].map(escapeCsvCell).join(","),
    ["summary", "summary", evidence.summary].map(escapeCsvCell).join(","),
    "",
    "section,lineNumber,value",
    ...evidence.lines.map((line, index) =>
      ["evidence", index + 1, line].map(escapeCsvCell).join(","),
    ),
  ].join("\n");
}

function escapeCsvCell(value: string | number) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}
