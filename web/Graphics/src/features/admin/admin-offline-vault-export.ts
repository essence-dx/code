import {
  getAdminOfflineVaultJson,
  validateAdminOfflineVaultPackage,
  type AdminOfflineVaultPackage,
} from "@/features/admin/admin-offline-vault";

export { getAdminOfflineVaultJson };

export function getAdminOfflineVaultCsv(vault: AdminOfflineVaultPackage) {
  const report = validateAdminOfflineVaultPackage(vault);

  return [
    [
      "id",
      "kind",
      "status",
      "label",
      "value",
      "detail",
      "recommendation",
    ].join(","),
    ...report.rows.map((row) =>
      [
        row.id,
        row.kind,
        row.status,
        row.label,
        row.value,
        row.detail,
        row.recommendation,
      ]
        .map(escapeCsvValue)
        .join(","),
    ),
  ].join("\n");
}

export function getAdminOfflineVaultMarkdown(vault: AdminOfflineVaultPackage) {
  const report = validateAdminOfflineVaultPackage(vault);

  return [
    "# Essence Offline Vault",
    "",
    `- Package: ${vault.packageId}`,
    `- Generated: ${vault.generatedAt}`,
    `- Exported by: ${vault.exportedBy}`,
    `- Status: ${report.status} (${report.score}/100)`,
    `- Design files: ${vault.manifest.designFileCount}`,
    `- Pages: ${vault.manifest.pageCount}`,
    `- Layers: ${vault.manifest.layerCount}`,
    `- Estimated size: ${formatBytes(vault.manifest.estimatedBytes)}`,
    `- Checksum: ${vault.manifest.checksum}`,
    "",
    "## Restore Guide",
    "",
    ...vault.restoreGuide.map((item) => `- ${item}`),
    "",
    "## Import Checks",
    "",
    "| Check | Status | Value | Recommendation |",
    "| --- | --- | --- | --- |",
    ...report.rows.map(
      (row) =>
        `| ${escapeMarkdown(row.label)} | ${row.status} | ${escapeMarkdown(row.value)} | ${escapeMarkdown(row.recommendation)} |`,
    ),
  ].join("\n");
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function escapeCsvValue(value: string | number | boolean | null) {
  const text = String(value ?? "");

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

function escapeMarkdown(value: string) {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}
