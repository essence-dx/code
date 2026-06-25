export type ImportKind = "json" | "svg" | "image" | "video" | "pdf" | "unknown";

export type ImportDiagnosticReport = {
  title: string;
  fileName?: string;
  detectedKind?: ImportKind;
  issues: string[];
  hints: string[];
};

const bitmapImageExtensions = new Set([
  "apng",
  "avif",
  "bmp",
  "gif",
  "jpeg",
  "jpg",
  "png",
  "webp",
]);
const videoExtensions = new Set([
  "m4v",
  "mov",
  "mp4",
  "mpeg",
  "mpg",
  "ogg",
  "ogv",
  "webm",
]);

export class ImportDiagnosticError extends Error {
  readonly report: ImportDiagnosticReport;

  constructor(report: ImportDiagnosticReport) {
    super(report.title);
    this.name = "ImportDiagnosticError";
    this.report = report;
  }
}

export function detectImportKind(file: File): ImportKind {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (file.type === "application/json" || extension === "json") {
    return "json";
  }

  if (file.type === "image/svg+xml" || extension === "svg") {
    return "svg";
  }

  if (file.type === "application/pdf" || extension === "pdf") {
    return "pdf";
  }

  if (file.type.startsWith("image/") || bitmapImageExtensions.has(extension)) {
    return "image";
  }

  if (file.type.startsWith("video/") || videoExtensions.has(extension)) {
    return "video";
  }

  return "unknown";
}

export function assertImportKind(
  file: File,
  expectedKinds: ImportKind[],
  targetLabel: string,
) {
  const detectedKind = detectImportKind(file);

  if (expectedKinds.includes(detectedKind)) {
    return detectedKind;
  }

  throw new ImportDiagnosticError({
    title: `${targetLabel} import cannot use this file`,
    fileName: file.name,
    detectedKind,
    issues: [
      `Detected ${getKindLabel(detectedKind)} while ${targetLabel} import expects ${expectedKinds
        .map(getKindLabel)
        .join(" or ")}.`,
    ],
    hints: getKindHints(detectedKind),
  });
}

export function unsupportedPdfImportReport(file: File): ImportDiagnosticReport {
  return {
    title: "PDF import is not supported yet",
    fileName: file.name,
    detectedKind: "pdf",
    issues: [
      "This editor can export PDF, but it cannot turn PDF pages back into editable layers yet.",
    ],
    hints: [
      "Export the source design as SVG for editable vector layers.",
      "Export the source page as PNG or JPG when a flat image layer is enough.",
    ],
  };
}

export function invalidDesignJsonReport(value: unknown): ImportDiagnosticReport {
  const issues: string[] = [];

  if (!isRecord(value)) {
    issues.push("The JSON root is not an object.");
  } else {
    if (value.version !== 1) {
      issues.push("Missing or unsupported document version. Expected version 1.");
    }
    if (!Array.isArray(value.pages) || value.pages.length === 0) {
      issues.push("The document must include at least one page.");
    }
    if (typeof value.activePageId !== "string") {
      issues.push("The document is missing an active page id.");
    }
    if (!isRecord(value.components)) {
      issues.push("The document must include a components map.");
    }
    if (!isRecord(value.variables)) {
      issues.push("The document must include a variables map.");
    }
    if (typeof value.updatedAt !== "string") {
      issues.push("The document is missing an updatedAt timestamp.");
    }
  }

  return {
    title: "JSON is not an Essence design document",
    detectedKind: "json",
    issues:
      issues.length > 0
        ? issues
        : ["The file shape did not match the current design document schema."],
    hints: [
      "Use File > JSON from this editor for a round-trip import.",
      "Component library JSON should be imported through the library import flow.",
    ],
  };
}

export function errorToImportReport(
  error: unknown,
  fallbackTitle: string,
  file?: File,
): ImportDiagnosticReport {
  if (error instanceof ImportDiagnosticError) {
    return error.report;
  }

  return {
    title: fallbackTitle,
    fileName: file?.name,
    detectedKind: file ? detectImportKind(file) : undefined,
    issues: [error instanceof Error ? error.message : fallbackTitle],
    hints: file ? getKindHints(detectImportKind(file)) : [],
  };
}

export function getImportReportSummary(report: ImportDiagnosticReport) {
  const filePart = report.fileName ? `${report.fileName}: ` : "";
  return `${filePart}${report.title}`;
}

function getKindLabel(kind: ImportKind) {
  const labels: Record<ImportKind, string> = {
    json: "JSON",
    svg: "SVG",
    image: "bitmap image",
    video: "video",
    pdf: "PDF",
    unknown: "an unsupported file type",
  };

  return labels[kind];
}

function getKindHints(kind: ImportKind) {
  const hints: Record<ImportKind, string[]> = {
    json: ["Use Import JSON for saved Essence design documents."],
    svg: ["Use Import SVG for editable vector layers."],
    image: ["Use Import Media for PNG, JPG, WebP, GIF, and other image assets."],
    video: ["Use Import Media for MP4, WebM, MOV, and other browser-playable videos."],
    pdf: [
      "PDF import is not available yet.",
      "Convert the PDF page to SVG for editable shapes or PNG/JPG for a flat image.",
    ],
    unknown: ["Try JSON, SVG, PNG, JPG, WebP, GIF, MP4, WebM, MOV, or PDF."],
  };

  return hints[kind];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
