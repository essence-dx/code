import type { LibraryPublishReadinessReport } from "@/features/editor/library-publish-readiness";
import type { LibraryPublishRiskReport } from "@/features/editor/library-publish-risk";
import type { LibraryReleaseApprovalReport } from "@/features/editor/library-release-approval";
import type { LibraryReleaseArchive } from "@/features/editor/library-release-archive";

export function getLibraryReleaseGovernanceCsv({
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
  const summaryRows = [
    ["library", archive.library.name],
    ["team", archive.library.teamName],
    ["targetVersion", archive.library.targetVersion],
    ["payloadHash", archive.integrity.payloadHash],
    ["readinessScore", readiness.score],
    ["readinessLabel", readiness.label],
    ["riskScore", risk.score],
    ["riskLabel", risk.label],
    ["approvalOutstanding", approval.outstandingCount],
    ["approvalAcknowledged", approval.acknowledgedCount],
    ["reportRows", archive.integrity.reportRowCount],
  ];
  const approvalRows = approval.items.map((item) => [
    "approval",
    item.id,
    item.label,
    item.severity,
    item.acknowledged ? "acknowledged" : "open",
    item.detail,
    item.note ?? "",
  ]);
  const riskRows = risk.items.map((item) => [
    "risk",
    item.id,
    item.label,
    item.severity,
    item.impact,
    item.detail,
  ]);

  return [
    "section,key,value",
    ...summaryRows.map((row) =>
      ["summary", ...row].map(escapeCsvCell).join(","),
    ),
    "",
    "section,id,label,severity,status_or_impact,detail,note",
    ...approvalRows.map((row) => row.map(escapeCsvCell).join(",")),
    ...riskRows.map((row) => row.map(escapeCsvCell).join(",")),
  ].join("\n");
}

function escapeCsvCell(value: string | number) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}
