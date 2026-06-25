import type { LibraryReleaseApprovalReport } from "@/features/editor/library-release-approval";
import type {
  LibraryReleaseArchiveComparison,
  LibraryReleaseArchiveImportSummary,
  LibraryReleaseArchiveVerification,
} from "@/features/editor/library-release-archive";

export type LibraryReleaseReplayItem = {
  id: string;
  label: string;
  detail: string;
  status: "ready" | "review" | "missing";
};

export type LibraryReleaseReplaySummary = {
  totalCount: number;
  readyCount: number;
  reviewCount: number;
  missingCount: number;
};

export function getLibraryReleaseReplayChecklist({
  archiveComparison,
  archiveImportSummary,
  archiveVerification,
  importedApproval,
}: {
  archiveComparison: LibraryReleaseArchiveComparison | null;
  archiveImportSummary: LibraryReleaseArchiveImportSummary | null;
  archiveVerification: LibraryReleaseArchiveVerification | null;
  importedApproval: LibraryReleaseApprovalReport | null;
}): LibraryReleaseReplayItem[] {
  return [
    {
      id: "integrity",
      label: "Integrity",
      detail: archiveVerification
        ? archiveVerification.detail
        : "Import and verify a release archive.",
      status: archiveVerification
        ? archiveVerification.valid
          ? "ready"
          : "review"
        : "missing",
    },
    {
      id: "summary",
      label: "Summary",
      detail: archiveImportSummary
        ? `${archiveImportSummary.componentCount} components, ${archiveImportSummary.reportRowCount} report rows`
        : "No archive summary loaded.",
      status: archiveImportSummary ? "ready" : "missing",
    },
    {
      id: "comparison",
      label: "Comparison",
      detail: archiveComparison?.detail ?? "No archive comparison available.",
      status: archiveComparison
        ? archiveComparison.versionChanged ||
          archiveComparison.currentOnlyCount > 0 ||
          archiveComparison.archivedOnlyCount > 0
          ? "review"
          : "ready"
        : "missing",
    },
    {
      id: "approval",
      label: "Approval",
      detail: importedApproval
        ? `${importedApproval.acknowledgedCount}/${importedApproval.itemCount} approvals available for restore`
        : "Imported archive does not include approval state.",
      status: importedApproval ? "ready" : "missing",
    },
  ];
}

export function getLibraryReleaseReplaySummary(
  items: LibraryReleaseReplayItem[],
): LibraryReleaseReplaySummary {
  return {
    totalCount: items.length,
    readyCount: items.filter((item) => item.status === "ready").length,
    reviewCount: items.filter((item) => item.status === "review").length,
    missingCount: items.filter((item) => item.status === "missing").length,
  };
}

export function getLibraryReleaseReplayChecklistCsv(
  items: LibraryReleaseReplayItem[],
) {
  const header: Array<keyof LibraryReleaseReplayItem> = [
    "id",
    "label",
    "status",
    "detail",
  ];

  return [
    header.join(","),
    ...items.map((item) =>
      header.map((key) => escapeCsvCell(item[key])).join(","),
    ),
  ].join("\n");
}

function escapeCsvCell(value: string) {
  if (!/[",\n]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}
