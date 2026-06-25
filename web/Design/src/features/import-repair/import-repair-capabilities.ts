import { maxMediaAssetBytes } from "@/features/assets/asset-constraints";
import { svgMimeType } from "@/features/assets/svg-assets";
import {
  maxDocxImportBlocks,
  maxDocxImportBytes,
} from "@/features/editor/office-docx-import";
import {
  maxXlsxImportBytes,
  maxXlsxImportSheets,
} from "@/features/editor/office-xlsx-import";
import {
  maxPdfEditorImportBytes,
  maxPdfEditorImportPages,
} from "@/features/editor/pdf-import";
import {
  maxPptxElementsPerSlide,
  maxPptxImportBytes,
  maxPptxImportSlides,
} from "@/features/editor/pptx-import";
import { maxLottieJsonBytes } from "@/features/editor/lottie-import";
import type {
  ImportRepairCapability,
  ImportRepairFormat,
  ImportRepairMappingDiff,
  ImportRepairRetryStrategy,
} from "@/features/import-repair/import-repair-operations-types";

export const importRepairFormats: ImportRepairFormat[] = [
  "pdf",
  "pptx",
  "docx",
  "xlsx",
  "svg",
  "media",
];

export const importRepairCapabilities: Record<
  ImportRepairFormat,
  ImportRepairCapability
> = {
  pdf: {
    format: "pdf",
    label: "PDF repair",
    sourceNoun: "source PDF",
    acceptedSources: ["application/pdf", ".pdf"],
    sourceLimits: [
      `${formatBytes(maxPdfEditorImportBytes)} per file`,
      `${maxPdfEditorImportPages} pages per import`,
    ],
    capabilitySummary: [
      "Renders each PDF page as a locked reference image.",
      "Reconstructs readable text as editable text layers.",
      "Builds outline notes from heading-sized PDF text.",
    ],
    nameHints: [/pdf/i],
    pageTypeHints: ["docs", "print"],
    mappingDiffs: [
      createDiff({
        id: "pdf-scanned-text",
        source: "Scanned or flattened text",
        target: "Locked page image plus extracted editable text when readable",
        gap: "Image-only PDFs cannot expose selectable text without OCR.",
        repair:
          "Split image-only pages into a review queue and add manual text overlays.",
        severity: "blocked",
      }),
      createDiff({
        id: "pdf-flow",
        source: "PDF text flow and columns",
        target: "Positioned text layers",
        gap: "Text can import as visual line fragments instead of flowing paragraphs.",
        repair:
          "Group adjacent text lines into document blocks before final export.",
        severity: "review",
      }),
      createDiff({
        id: "pdf-page-cap",
        source: "Long PDFs",
        target: "Bounded editable project pages",
        gap: `Imports stop after ${maxPdfEditorImportPages} pages.`,
        repair: "Split long source PDFs into smaller import batches.",
        severity: "review",
      }),
    ],
    retryStrategy: createRetryStrategy({
      id: "retry-pdf",
      title: "PDF repair retry",
      maxAttempts: 3,
      steps: [
        `Split PDFs above ${maxPdfEditorImportPages} pages into smaller batches.`,
        "Retry the import with page images preserved as locked references.",
        "Run accessibility and print checks on the repaired project.",
        "Export a conversion evidence packet before client handoff.",
      ],
      fallback:
        "Keep the locked page image and manually rebuild missing text blocks.",
    }),
  },
  pptx: {
    format: "pptx",
    label: "PPTX repair",
    sourceNoun: "source PPTX",
    acceptedSources: [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".pptx",
    ],
    sourceLimits: [
      `${formatBytes(maxPptxImportBytes)} per file`,
      `${maxPptxImportSlides} slides`,
      `${maxPptxElementsPerSlide} elements per slide`,
    ],
    capabilitySummary: [
      "Reads slide order, dimensions, backgrounds, shapes, text, and images.",
      "Converts readable slide objects into editable Essence layers.",
      "Preserves a bounded element count to keep large decks responsive.",
    ],
    nameHints: [/pptx/i, /deck/i, /slide/i, /presentation/i],
    pageTypeHints: ["presentations"],
    mappingDiffs: [
      createDiff({
        id: "pptx-animations",
        source: "Animations, transitions, and SmartArt",
        target: "Static editable layers",
        gap: "Advanced Office-only behavior is flattened during import.",
        repair:
          "Rebuild motion with Essence timeline presets and note unsupported SmartArt.",
        severity: "review",
      }),
      createDiff({
        id: "pptx-media",
        source: "Embedded charts and media",
        target: "Editable layers when readable, otherwise image references",
        gap: "Some embedded objects cannot become native charts or video clips.",
        repair:
          "Route embedded objects through media or chart replacement checks.",
        severity: "review",
      }),
      createDiff({
        id: "pptx-overflow",
        source: "Dense slide objects",
        target: "Bounded editable layer set",
        gap: `Slides are capped at ${maxPptxElementsPerSlide} imported elements.`,
        repair:
          "Import dense slides separately and remove decorative source fragments.",
        severity: "info",
      }),
    ],
    retryStrategy: createRetryStrategy({
      id: "retry-pptx",
      title: "PPTX repair retry",
      maxAttempts: 3,
      steps: [
        "Retry after removing unsupported Office add-ins from the deck.",
        "Convert SmartArt or embedded charts to source images when native mapping fails.",
        "Rebuild animations with Essence motion presets.",
        "Snapshot the repaired deck before scheduling review.",
      ],
      fallback:
        "Keep the slide image as reference and rebuild editable text/shape layers.",
    }),
  },
  docx: {
    format: "docx",
    label: "DOCX repair",
    sourceNoun: "source DOCX",
    acceptedSources: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".docx",
    ],
    sourceLimits: [
      `${formatBytes(maxDocxImportBytes)} per file`,
      `${maxDocxImportBlocks} readable blocks`,
    ],
    capabilitySummary: [
      "Reads paragraphs, heading-like styles, alignment, bold runs, and tables.",
      "Paginates document content into editable Essence pages.",
      "Maps readable DOCX tables to native table layers.",
    ],
    nameHints: [/docx/i, /word/i, /document/i, /brief/i],
    pageTypeHints: ["docs"],
    mappingDiffs: [
      createDiff({
        id: "docx-rich-regions",
        source: "Headers, footers, comments, and tracked changes",
        target: "Editable document/text/table layers",
        gap: "Non-body Word regions are not first-class editable structures.",
        repair:
          "Add handoff notes for dropped regions and rebuild required legal copy.",
        severity: "review",
      }),
      createDiff({
        id: "docx-images",
        source: "Inline images and floating objects",
        target: "Document text and table content",
        gap: "The first-pass DOCX importer focuses on readable text and tables.",
        repair:
          "Import source images separately into the asset panel and relink them.",
        severity: "review",
      }),
    ],
    retryStrategy: createRetryStrategy({
      id: "retry-docx",
      title: "DOCX repair retry",
      maxAttempts: 2,
      steps: [
        "Retry after accepting tracked changes in the source document.",
        "Split documents with more than the block cap into section files.",
        "Run accessibility review for rebuilt document images and links.",
      ],
      fallback: "Paste important body copy into a native document layer.",
    }),
  },
  xlsx: {
    format: "xlsx",
    label: "XLSX repair",
    sourceNoun: "source XLSX",
    acceptedSources: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".xlsx",
    ],
    sourceLimits: [
      `${formatBytes(maxXlsxImportBytes)} per file`,
      `${maxXlsxImportSheets} sheets`,
    ],
    capabilitySummary: [
      "Reads workbook sheet order and shared strings.",
      "Converts readable rows into native multi-sheet table layers.",
      "Preserves workbook-like sheet tabs for imported data grids.",
    ],
    nameHints: [/xlsx/i, /workbook/i, /spreadsheet/i, /sheet/i, /metrics/i],
    pageTypeHints: ["sheets"],
    mappingDiffs: [
      createDiff({
        id: "xlsx-formulas",
        source: "Formulas, pivots, charts, and macros",
        target: "Rendered cell values in native tables",
        gap: "Spreadsheet automation is not executed during import.",
        repair:
          "Recreate critical formulas with Essence table formulas and chart layers.",
        severity: "review",
      }),
      createDiff({
        id: "xlsx-sheet-cap",
        source: "Large workbooks",
        target: "Bounded sheet-backed tables",
        gap: `Imports stop after ${maxXlsxImportSheets} sheets.`,
        repair: "Import workbooks by business-critical sheet groups.",
        severity: "info",
      }),
    ],
    retryStrategy: createRetryStrategy({
      id: "retry-xlsx",
      title: "XLSX repair retry",
      maxAttempts: 2,
      steps: [
        "Retry after saving formulas as values for source-of-truth snapshots.",
        "Split workbooks by sheet group when the sheet cap is exceeded.",
        "Run table validation and chart readiness checks after repair.",
      ],
      fallback: "Import the critical sheet as CSV and rebuild charts manually.",
    }),
  },
  svg: {
    format: "svg",
    label: "SVG repair",
    sourceNoun: "source SVG",
    acceptedSources: [svgMimeType, ".svg"],
    sourceLimits: ["Sanitized browser-readable SVG markup"],
    capabilitySummary: [
      "Sanitizes unsafe tags, event handlers, style attributes, and risky hrefs.",
      "Reads SVG dimensions from width/height or viewBox.",
      "Can preserve or strip colors for renderable vector assets.",
    ],
    nameHints: [/svg/i, /vector/i, /icon/i, /logo/i],
    pageTypeHints: ["social", "websites", "print"],
    mappingDiffs: [
      createDiff({
        id: "svg-sanitized-markup",
        source: "Scripts, foreignObject, inline styles, and unsafe hrefs",
        target: "Sanitized SVG asset",
        gap: "Unsafe or browser-incompatible markup is removed.",
        repair:
          "Review the sanitized preview and replace removed behavior with native layers.",
        severity: "review",
      }),
      createDiff({
        id: "svg-editability",
        source: "Nested SVG path structure",
        target: "Renderable SVG layer",
        gap: "Complex SVG markup does not automatically become editable path layers.",
        repair:
          "Convert critical shapes into native vector paths when editability is required.",
        severity: "info",
      }),
    ],
    retryStrategy: createRetryStrategy({
      id: "retry-svg",
      title: "SVG repair retry",
      maxAttempts: 2,
      steps: [
        "Retry after exporting a plain SVG without scripts or external references.",
        "Preserve colors first, then strip colors only for brand-recolor workflows.",
        "Check dimensions and asset provenance before publishing.",
      ],
      fallback:
        "Use the sanitized SVG as a locked asset and redraw critical paths.",
    }),
  },
  media: {
    format: "media",
    label: "Media repair",
    sourceNoun: "source media file",
    acceptedSources: ["video/*", "audio/*", "application/json", ".json"],
    sourceLimits: [
      `${formatBytes(maxMediaAssetBytes)} media asset cap`,
      `${formatBytes(maxLottieJsonBytes)} Lottie JSON cap`,
    ],
    capabilitySummary: [
      "Reads video dimensions from browser metadata.",
      "Imports audio and video as reusable media layers.",
      "Validates Lottie JSON before creating animation layers.",
    ],
    nameHints: [/media/i, /video/i, /audio/i, /mp4/i, /mp3/i, /lottie/i],
    pageTypeHints: ["videos"],
    mappingDiffs: [
      createDiff({
        id: "media-transcode",
        source: "Codec, captions, trim points, and timeline effects",
        target: "Browser-readable media layers and timeline controls",
        gap: "Unsupported codecs or external tracks may not expose full timeline metadata.",
        repair:
          "Retry with browser-safe MP4/WebM/MP3 sources and rebuild captions in Essence.",
        severity: "review",
      }),
      createDiff({
        id: "lottie-validation",
        source: "Arbitrary JSON animation files",
        target: "Validated Lottie animation JSON",
        gap: "JSON without a Lottie layers array is rejected.",
        repair:
          "Export a valid Lottie JSON package and retry the animation import.",
        severity: "info",
      }),
    ],
    retryStrategy: createRetryStrategy({
      id: "retry-media",
      title: "Media repair retry",
      maxAttempts: 3,
      steps: [
        "Retry with browser-safe codecs and local file metadata available.",
        "Normalize captions and audio-ducking cues after import.",
        "Run video timeline readiness before export certification.",
      ],
      fallback:
        "Keep the media as a source asset and rebuild the scene timeline manually.",
    }),
  },
};

function createDiff(input: ImportRepairMappingDiff): ImportRepairMappingDiff {
  return input;
}

function createRetryStrategy(
  input: ImportRepairRetryStrategy,
): ImportRepairRetryStrategy {
  return input;
}

function formatBytes(value: number) {
  const megabytes = value / (1024 * 1024);

  if (Number.isInteger(megabytes)) return `${megabytes} MB`;

  return `${megabytes.toFixed(1)} MB`;
}
