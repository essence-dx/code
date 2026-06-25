import type { LibraryReleaseArchiveImportSummary } from "@/features/editor/library-release-archive";
import type { LibraryReleaseEvidenceSummary } from "@/features/editor/library-release-evidence";
import type { LibraryReleaseGovernanceWarning } from "@/features/editor/library-release-governance-review";
import type { LibraryReleaseReplayItem } from "@/features/editor/library-release-replay";

export type LibraryReleaseSearchResult = {
  id: string;
  source: "evidence" | "warning" | "replay" | "archive";
  label: string;
  detail: string;
};

export function getLibraryReleaseSearchResults({
  archiveImportSummary,
  evidence,
  query,
  replayItems,
  warnings,
}: {
  archiveImportSummary: LibraryReleaseArchiveImportSummary | null;
  evidence: LibraryReleaseEvidenceSummary;
  query: string;
  replayItems: LibraryReleaseReplayItem[];
  warnings: LibraryReleaseGovernanceWarning[];
}): LibraryReleaseSearchResult[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  return [
    ...evidence.lines.map((line, index) => ({
      id: `evidence:${index}`,
      source: "evidence" as const,
      label: `Evidence ${index + 1}`,
      detail: line,
    })),
    ...warnings.map((warning) => ({
      id: `warning:${warning.id}`,
      source: "warning" as const,
      label: warning.label,
      detail: warning.detail,
    })),
    ...replayItems.map((item) => ({
      id: `replay:${item.id}`,
      source: "replay" as const,
      label: item.label,
      detail: item.detail,
    })),
    ...getArchiveSearchResults(archiveImportSummary),
  ].filter((result) =>
    [result.source, result.label, result.detail].some((value) =>
      value.toLowerCase().includes(normalizedQuery),
    ),
  );
}

export function getLibraryReleaseSearchResultsCsv(
  results: LibraryReleaseSearchResult[],
) {
  const header: Array<keyof LibraryReleaseSearchResult> = [
    "id",
    "source",
    "label",
    "detail",
  ];

  return [
    header.join(","),
    ...results.map((result) =>
      header.map((key) => escapeCsvCell(result[key])).join(","),
    ),
  ].join("\n");
}

export function getLibraryReleasePinnedQueriesCsv(queries: string[]) {
  return [
    "index,query",
    ...queries.map((query, index) =>
      [index + 1, query].map(escapeCsvCell).join(","),
    ),
  ].join("\n");
}

function getArchiveSearchResults(
  archiveImportSummary: LibraryReleaseArchiveImportSummary | null,
): LibraryReleaseSearchResult[] {
  if (!archiveImportSummary) {
    return [];
  }

  return [
    {
      id: "archive:library",
      source: "archive",
      label: archiveImportSummary.libraryName,
      detail: `${archiveImportSummary.teamName} v${archiveImportSummary.targetVersion}`,
    },
    {
      id: "archive:integrity",
      source: "archive",
      label: "Archive integrity",
      detail: archiveImportSummary.payloadHash,
    },
    {
      id: "archive:scores",
      source: "archive",
      label: "Archive scores",
      detail: `ready ${archiveImportSummary.readinessScore}, risk ${archiveImportSummary.riskScore}, open ${archiveImportSummary.approvalOpenCount}`,
    },
  ];
}

function escapeCsvCell(value: string | number) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}
