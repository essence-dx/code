import { normalizeExportProofBundle, type ExportProofBundle } from "@/lib/projects/export-proof-bundle";

export function serializeExportProofBundle(bundle: ExportProofBundle) {
  return `${JSON.stringify(bundle, null, 2)}\n`;
}

export function parseDownloadedExportProofBundle(text: string) {
  try {
    return normalizeExportProofBundle(JSON.parse(text));
  } catch {
    return null;
  }
}

export function proofBundleDownloadFilename(bundle: Pick<ExportProofBundle, "outputName">) {
  const stem = bundle.outputName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return `${stem || "export"}-proof-bundle.json`;
}

export function downloadExportProofBundle(bundle: ExportProofBundle) {
  if (typeof document === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined") return false;

  const blob = new Blob([serializeExportProofBundle(bundle)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = proofBundleDownloadFilename(bundle);
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return true;
}
