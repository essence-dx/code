import type { LibraryReleaseApprovalReport } from "@/features/editor/library-release-approval";
import type {
  LibraryReleaseArchiveComparison,
  LibraryReleaseArchiveVerification,
} from "@/features/editor/library-release-archive";

export type LibraryReleaseGovernanceWarning = {
  id: string;
  label: string;
  detail: string;
  severity: "warning" | "blocker";
};

export function getLibraryReleaseGovernanceWarnings({
  archiveComparison,
  archiveVerification,
  approval,
}: {
  archiveComparison: LibraryReleaseArchiveComparison | null;
  archiveVerification: LibraryReleaseArchiveVerification | null;
  approval: LibraryReleaseApprovalReport;
}): LibraryReleaseGovernanceWarning[] {
  const warnings: LibraryReleaseGovernanceWarning[] = [];

  if (archiveVerification && !archiveVerification.valid) {
    warnings.push({
      id: "archive-integrity",
      label: "Archive integrity",
      detail: archiveVerification.detail,
      severity: "blocker",
    });
  }

  if (archiveComparison?.versionChanged) {
    warnings.push({
      id: "archive-version",
      label: "Archive version",
      detail: "Imported archive target version differs from the current release.",
      severity: "warning",
    });
  }

  if (
    archiveComparison &&
    (archiveComparison.currentOnlyCount > 0 ||
      archiveComparison.archivedOnlyCount > 0)
  ) {
    warnings.push({
      id: "archive-components",
      label: "Archive components",
      detail: `${archiveComparison.currentOnlyCount} current-only, ${archiveComparison.archivedOnlyCount} archived-only components.`,
      severity: "warning",
    });
  }

  if (approval.outstandingCount > 0) {
    warnings.push({
      id: "approval-open",
      label: "Approval open",
      detail: `${approval.outstandingCount} release approval item${
        approval.outstandingCount === 1 ? "" : "s"
      } still open.`,
      severity: "warning",
    });
  }

  return warnings;
}

export function getLibraryReleaseGovernanceWarningsCsv(
  warnings: LibraryReleaseGovernanceWarning[],
) {
  const header: Array<keyof LibraryReleaseGovernanceWarning> = [
    "id",
    "label",
    "severity",
    "detail",
  ];

  return [
    header.join(","),
    ...warnings.map((warning) =>
      header.map((key) => escapeCsvCell(warning[key])).join(","),
    ),
  ].join("\n");
}

export function getLibraryReleaseGovernanceWarningsText(
  warnings: LibraryReleaseGovernanceWarning[],
) {
  if (warnings.length === 0) {
    return "No governance warnings.";
  }

  return warnings
    .map(
      (warning) =>
        `- [${warning.severity}] ${warning.label}: ${warning.detail}`,
    )
    .join("\n");
}

function escapeCsvCell(value: string) {
  if (!/[",\n]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}
