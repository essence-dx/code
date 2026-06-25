import type { AdminReleaseArtifactManifestReport } from "@/features/admin/admin-release-artifact-manifest";

export function getAdminReleaseArtifactManifestJson(
  report: AdminReleaseArtifactManifestReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminReleaseArtifactManifestCsv(
  report: AdminReleaseArtifactManifestReport,
) {
  return [
    [
      "id",
      "kind",
      "status",
      "label",
      "file_name",
      "byte_size",
      "checksum",
      "signature_status",
      "source_status",
      "source_score",
      "detail",
      "recommendation",
    ].join(","),
    ...report.artifacts.map((artifact) =>
      [
        artifact.id,
        artifact.kind,
        artifact.status,
        artifact.label,
        artifact.fileName,
        artifact.byteSize,
        artifact.checksum,
        artifact.signatureStatus,
        artifact.sourceStatus,
        artifact.sourceScore,
        artifact.detail,
        artifact.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    "",
    [
      "manifest_id",
      "status",
      "score",
      "checksum",
      "signature",
      "signing_key_id",
      "signed_artifacts",
      "unsigned_artifacts",
      "blocked_artifacts",
      "total_bytes",
    ].join(","),
    [
      report.manifestId,
      report.status,
      report.score,
      report.checksum,
      report.signature,
      report.signing.keyId,
      report.signedArtifactCount,
      report.unsignedArtifactCount,
      report.blockedArtifactCount,
      report.totalByteSize,
    ]
      .map(escapeCsvCell)
      .join(","),
    "",
    ["id", "status", "label", "value", "detail", "recommendation"].join(","),
    ...report.rows.map((row) =>
      [
        row.id,
        row.status,
        row.label,
        row.value,
        row.detail,
        row.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getAdminReleaseArtifactManifestMarkdown(
  report: AdminReleaseArtifactManifestReport,
) {
  return [
    "# Signed Release Artifact Manifest",
    "",
    `Generated: ${report.generatedAt}`,
    `Manifest: ${report.manifestId}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Checksum: ${report.checksum}`,
    `Signature: ${report.signature ?? "unsigned"}`,
    `Signing key: ${report.signing.keyId}`,
    "",
    "## Summary",
    "",
    `- Artifacts: ${report.artifactCount}`,
    `- Signed artifacts: ${report.signedArtifactCount}`,
    `- Unsigned artifacts: ${report.unsignedArtifactCount}`,
    `- Required artifacts: ${report.requiredArtifactCount}`,
    `- Blocked artifacts: ${report.blockedArtifactCount}`,
    `- Total bytes: ${report.totalByteSize}`,
    "",
    "## Review Rows",
    "",
    ...report.rows.map(
      (row) =>
        `- [${row.status}] ${row.label} (${row.value}): ${row.detail} Recommendation: ${row.recommendation}`,
    ),
    "",
    "## Artifacts",
    "",
    ...report.artifacts.map(
      (artifact) =>
        `- [${artifact.status}] ${artifact.kind} / ${artifact.label}: ${artifact.fileName}, ${artifact.byteSize} bytes, ${artifact.checksum}, ${artifact.signatureStatus}. ${artifact.detail}`,
    ),
  ].join("\n");
}

function escapeCsvCell(value: boolean | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
