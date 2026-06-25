import {
  looksLikeJson,
  looksLikeSvg,
  readClipboardFiles,
  readClipboardText,
  writeClipboardBlob,
  writeClipboardText,
} from "@/features/editor/clipboard-interop";
import { exportDocumentToPngBlob } from "@/features/editor/exporters/png-exporter";
import { exportDocumentToSvg } from "@/features/editor/exporters/svg-exporter";
import {
  getScopedExportDocument,
  type ExportScope,
} from "@/features/editor/exporters/export-settings";
import {
  getSvgImportDiagnostic,
  importSvgLayers,
} from "@/features/editor/importers/svg-importer";
import { importDesignDocumentJson } from "@/features/editor/importers/json-importer";
import { readLayerClipboard } from "@/features/editor/layer-clipboard";
import type {
  DesignDocument,
  DesignLayer,
} from "@/features/editor/types";

export type DesignClipboardImport =
  | { kind: "layers"; layers: DesignLayer[] }
  | { kind: "media"; files: File[] }
  | { kind: "svg"; layers: DesignLayer[] }
  | { kind: "json"; document: DesignDocument }
  | { kind: "svg-empty"; report: ReturnType<typeof getSvgImportDiagnostic> }
  | { kind: "empty" }
  | { kind: "unsupported" };

export async function copyDesignJsonToClipboard(
  document: DesignDocument,
  selectedLayerIds: string[],
) {
  const exportDocument = getClipboardExportDocument(document, selectedLayerIds);

  return writeClipboardText(JSON.stringify(exportDocument, null, 2));
}

export async function copyDesignSvgToClipboard(
  document: DesignDocument,
  selectedLayerIds: string[],
) {
  const exportDocument = getClipboardExportDocument(document, selectedLayerIds);

  return writeClipboardText(exportDocumentToSvg(exportDocument));
}

export async function copyDesignPngToClipboard(
  document: DesignDocument,
  selectedLayerIds: string[],
) {
  const exportDocument = getClipboardExportDocument(document, selectedLayerIds);
  const blob = await exportDocumentToPngBlob(exportDocument);

  return writeClipboardBlob(blob);
}

export async function readDesignClipboard(): Promise<DesignClipboardImport> {
  const layers = await readLayerClipboard();

  if (layers?.length) {
    return { kind: "layers", layers };
  }

  const files = await readClipboardFiles();

  if (files.length > 0) {
    return { kind: "media", files };
  }

  const text = await readClipboardText();

  if (!text) {
    return { kind: "empty" };
  }

  if (looksLikeSvg(text)) {
    const importedLayers = importSvgLayers(text);

    if (importedLayers.length === 0) {
      return {
        kind: "svg-empty",
        report: getSvgImportDiagnostic(text, importedLayers.length),
      };
    }

    return { kind: "svg", layers: importedLayers };
  }

  if (looksLikeJson(text)) {
    return { kind: "json", document: importDesignDocumentJson(text) };
  }

  return { kind: "unsupported" };
}

function getClipboardExportDocument(
  document: DesignDocument,
  selectedLayerIds: string[],
) {
  const scope: ExportScope = selectedLayerIds.length > 0 ? "selection" : "page";

  return getScopedExportDocument(document, selectedLayerIds, scope);
}
