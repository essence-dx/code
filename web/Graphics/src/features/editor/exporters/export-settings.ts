import type {
  DesignDocument,
  DesignExportFormat,
  DesignExportPreset,
  DesignExportScale,
  DesignExportScope,
  DesignExportSettings,
} from "@/features/editor/types";

export type ExportFormat = DesignExportFormat;
export type ExportScope = DesignExportScope;
export type ExportScale = DesignExportScale;
export type ExportSettings = DesignExportSettings;
export type SavedExportPreset = DesignExportPreset;

export type ExportFileEntry = {
  filename: string;
  format: ExportFormat | "manifest";
  mimeType: string;
  scale: ExportScale;
};

export type ExportBatchPreset = {
  id: string;
  label: string;
  detail: string;
  settings: ExportSettings;
};

export const exportBatchPresets: ExportBatchPreset[] = [
  {
    id: "review",
    label: "Review",
    detail: "PNG and PDF for visual review.",
    settings: {
      formats: ["png", "pdf"],
      includeManifest: true,
      scale: 1,
      scope: "page",
    },
  },
  {
    id: "web",
    label: "Web",
    detail: "SVG plus 2x raster assets.",
    settings: {
      formats: ["svg", "png", "jpg"],
      includeManifest: true,
      scale: 2,
      scope: "selection",
    },
  },
  {
    id: "source",
    label: "Source",
    detail: "Editable JSON and SVG archive.",
    settings: {
      formats: ["json", "svg"],
      includeManifest: true,
      scale: 1,
      scope: "page",
    },
  },
  {
    id: "handoff",
    label: "Handoff",
    detail: "Source, vector, raster, and PDF.",
    settings: {
      formats: ["json", "svg", "png", "pdf"],
      includeManifest: true,
      scale: 2,
      scope: "selection",
    },
  },
];

export function getScopedExportDocument(
  document: DesignDocument,
  selectedLayerIds: string[],
  scope: ExportScope,
): DesignDocument {
  if (scope === "page" || selectedLayerIds.length === 0) {
    return document;
  }

  const selectedIds = new Set(selectedLayerIds);

  return {
    ...document,
    pages: document.pages.flatMap((page) => {
      if (page.id !== document.activePageId) {
        return [];
      }

      const layers = page.layers.filter((layer) => selectedIds.has(layer.id));

      return [
        {
          ...page,
          layers,
          comments: [],
          groups: (page.groups ?? [])
            .map((group) => ({
              ...group,
              layerIds: group.layerIds.filter((layerId) =>
                selectedIds.has(layerId),
              ),
            }))
            .filter((group) => group.layerIds.length > 1),
        },
      ];
    }),
  };
}

export function getExportName(fileName: string, scope: ExportScope) {
  const slug =
    fileName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "design";

  return scope === "selection" ? `${slug}-selection` : slug;
}

export function getExportFileEntries(
  exportName: string,
  settings: ExportSettings,
): ExportFileEntry[] {
  const scaleSuffix = settings.scale > 1 ? `@${settings.scale}x` : "";
  const entries = settings.formats.map<ExportFileEntry>((format) => ({
    filename:
      format === "png" || format === "jpg" || format === "pdf"
        ? `${exportName}${scaleSuffix}.${format}`
        : `${exportName}.${format}`,
    format,
    mimeType: getExportMimeType(format),
    scale: settings.scale,
  }));

  if (!settings.includeManifest) {
    return entries;
  }

  return [
    ...entries,
    {
      filename: `${exportName}-export-manifest.json`,
      format: "manifest",
      mimeType: "application/json",
      scale: settings.scale,
    },
  ];
}

function getExportMimeType(format: ExportFormat) {
  if (format === "json") {
    return "application/json";
  }

  if (format === "svg") {
    return "image/svg+xml";
  }

  if (format === "png") {
    return "image/png";
  }

  if (format === "jpg") {
    return "image/jpeg";
  }

  return "application/pdf";
}

export function getExportSettingsSummary(settings: ExportSettings) {
  const formats = settings.formats
    .map((format) => format.toUpperCase())
    .join(", ");
  const manifest = settings.includeManifest ? "with manifest" : "no manifest";

  return `${formats || "No formats"} / ${settings.scope} / ${settings.scale}x / ${manifest}`;
}
