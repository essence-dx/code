import {
  cleanText,
  nativeObjectKindLabel,
  normalizeAnchor,
  normalizeNativeObjectKind,
  normalizePackagePaths,
} from "@/features/workbooks/workbook-native-object-utils";
import { normalizePackagePath } from "@/features/workbooks/workbook-unsupported-part-codec";
import type {
  SheetData,
  WorkbookNativeChartMetadata,
  WorkbookNativeObject,
} from "@/features/workbooks/types";

export function normalizeNativeWorkbookObjects(
  value: unknown,
  sheets: SheetData[],
): WorkbookNativeObject[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sheetById = new Map(sheets.map((sheet) => [sheet.id, sheet]));
  const seen = new Set<string>();

  return value.flatMap((item, index) => {
    if (typeof item !== "object" || item === null) {
      return [];
    }

    const candidate = item as Partial<WorkbookNativeObject>;
    const kind = normalizeNativeObjectKind(candidate.kind);
    const packagePaths = normalizePackagePaths(candidate.packagePaths);
    const sheet =
      typeof candidate.sheetId === "string"
        ? sheetById.get(candidate.sheetId)
        : undefined;
    const sourcePath =
      typeof candidate.sourcePath === "string"
        ? normalizePackagePath(candidate.sourcePath).slice(0, 240)
        : undefined;
    const targetPath =
      typeof candidate.targetPath === "string"
        ? normalizePackagePath(candidate.targetPath).slice(0, 240)
        : undefined;
    const chart = candidate.chart
      ? normalizeNativeChartMetadata(candidate.chart)
      : undefined;
    const key = `${kind}:${candidate.relationshipId ?? ""}:${sourcePath ?? ""}:${
      targetPath ?? packagePaths.join("|")
    }`;

    if (!kind || packagePaths.length === 0 || seen.has(key)) {
      return [];
    }

    seen.add(key);

    return [
      {
        id:
          typeof candidate.id === "string" && candidate.id.trim()
            ? candidate.id.slice(0, 80)
            : `native_${index + 1}`,
        kind,
        name: cleanText(candidate.name, nativeObjectKindLabel(kind), 120),
        importedAt: cleanText(candidate.importedAt, new Date().toISOString(), 40),
        packagePaths,
        ...(sheet ? { sheetId: sheet.id, sheetName: sheet.name } : {}),
        ...(candidate.sheetName && !sheet
          ? { sheetName: cleanText(candidate.sheetName, "", 120) }
          : {}),
        ...(sourcePath ? { sourcePath } : {}),
        ...(targetPath ? { targetPath } : {}),
        ...(candidate.relationshipId
          ? { relationshipId: cleanText(candidate.relationshipId, "", 80) }
          : {}),
        ...(candidate.relationshipType
          ? {
              relationshipType: cleanText(candidate.relationshipType, "", 240),
            }
          : {}),
        ...(candidate.contentType
          ? { contentType: cleanText(candidate.contentType, "", 160) }
          : {}),
        ...(candidate.description
          ? { description: cleanText(candidate.description, "", 240) }
          : {}),
        ...(candidate.anchor ? { anchor: normalizeAnchor(candidate.anchor) } : {}),
        ...(chart ? { chart } : {}),
      },
    ];
  });
}

function normalizeNativeChartMetadata(
  value: WorkbookNativeChartMetadata,
): WorkbookNativeChartMetadata | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const metadata: WorkbookNativeChartMetadata = {
    chartType: cleanText(value.chartType, "", 80) || undefined,
    hasDataTable: value.hasDataTable === true ? true : undefined,
    threeDimensional: normalizeNativeChart3D(value.threeDimensional),
  };

  return Object.values(metadata).some((item) => item !== undefined)
    ? metadata
    : undefined;
}

function normalizeNativeChart3D(
  value: WorkbookNativeChartMetadata["threeDimensional"],
): WorkbookNativeChartMetadata["threeDimensional"] | undefined {
  if (typeof value !== "object" || value === null || value.enabled !== true) {
    return undefined;
  }

  return {
    enabled: true,
    depthPercent: normalizeNumber(value.depthPercent),
    perspective: normalizeNumber(value.perspective),
    rightAngleAxes:
      typeof value.rightAngleAxes === "boolean" ? value.rightAngleAxes : undefined,
    rotationX: normalizeNumber(value.rotationX),
    rotationY: normalizeNumber(value.rotationY),
  };
}

function normalizeNumber(value: unknown) {
  const numeric = Number(value);

  return Number.isFinite(numeric) ? Math.round(numeric) : undefined;
}
