import type { DesignActivityEvent } from "@/features/editor/types";

export type ExportActivityReviewRow = {
  id: string;
  label: string;
  detail: string;
  actorName: string;
  createdAt: string;
  fileCount: number | null;
  formats: string[];
  scale: string | null;
};

export function getExportActivityReviewRows(
  events: DesignActivityEvent[],
): ExportActivityReviewRow[] {
  return events
    .filter((event) => event.kind === "export")
    .map((event) => {
      const parsed = parseExportDetail(event.detail ?? "");

      return {
        id: event.id,
        label: event.label,
        detail: event.detail ?? "",
        actorName: event.actorName,
        createdAt: event.createdAt,
        fileCount: parsed.fileCount,
        formats: parsed.formats,
        scale: parsed.scale,
      };
    });
}

function parseExportDetail(detail: string) {
  const match = detail.match(/^(\d+) files? \/ (.+) at (\d+x)$/);

  if (!match) {
    return {
      fileCount: null,
      formats: [],
      scale: null,
    };
  }

  return {
    fileCount: Number(match[1]),
    formats: match[2]?.split(",").map((format) => format.trim()) ?? [],
    scale: match[3] ?? null,
  };
}
