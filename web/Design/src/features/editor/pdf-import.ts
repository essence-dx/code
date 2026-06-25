import {
  createEditablePdfPage,
  type PdfEditableTextItem,
} from "@/features/editor/pdf-editable-import";
import type { DesignPage } from "@/features/editor/types";

export const acceptedPdfImportMimeTypes = ["application/pdf"] as const;
export const maxPdfEditorImportBytes = 10 * 1024 * 1024;
export const maxPdfEditorImportPages = 24;

type OutputSize = {
  width: number;
  height: number;
};

export type PdfEditorImportResult =
  | {
      ok: true;
      pages: DesignPage[];
      importedPages: number;
      importedTextBlocks: number;
      importedImageBlocks: number;
      importedOutlineItems: number;
      truncated: boolean;
    }
  | {
      ok: false;
      message: string;
    };

let workerConfigured = false;

export function isAcceptedPdfImportFile(file: File) {
  return (
    acceptedPdfImportMimeTypes.includes(
      file.type as (typeof acceptedPdfImportMimeTypes)[number],
    ) || file.name.toLowerCase().endsWith(".pdf")
  );
}

export async function importPdfFileAsPages(
  file: File,
  output: OutputSize,
): Promise<PdfEditorImportResult> {
  if (!isAcceptedPdfImportFile(file)) {
    return {
      ok: false,
      message: "Use a PDF file to create editable pages.",
    };
  }

  if (file.size > maxPdfEditorImportBytes) {
    return {
      ok: false,
      message: "PDF page import is limited to 10 MB.",
    };
  }

  const pdfjs = await import("pdfjs-dist");

  configurePdfWorker(pdfjs.GlobalWorkerOptions);

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  });
  const pdf = await loadingTask.promise;
  const pageCount = Math.min(pdf.numPages, maxPdfEditorImportPages);
  const totalPdfPages = pdf.numPages;
  const pages: DesignPage[] = [];
  let importedTextBlocks = 0;
  let importedImageBlocks = 0;
  let importedOutlineItems = 0;

  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const fitScale = Math.min(
        output.width / viewport.width,
        output.height / viewport.height,
      );
      const displayWidth = Math.round(viewport.width * fitScale);
      const displayHeight = Math.round(viewport.height * fitScale);
      const displayX = Math.round((output.width - displayWidth) / 2);
      const displayY = Math.round((output.height - displayHeight) / 2);
      const renderScale = Math.min(2.5, Math.max(1, fitScale * 1.75));
      const renderViewport = page.getViewport({ scale: renderScale });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        return {
          ok: false,
          message: "Could not prepare a canvas for this PDF.",
        };
      }

      const textItems = await extractPdfEditableTextItems({
        page,
        viewport,
        scale: fitScale,
        offsetX: displayX,
        offsetY: displayY,
      });

      canvas.width = Math.ceil(renderViewport.width);
      canvas.height = Math.ceil(renderViewport.height);
      await page.render({
        canvas,
        canvasContext: context,
        viewport: renderViewport,
      }).promise;

      const editablePage = createEditablePdfPage({
        name: `${file.name.replace(/\.pdf$/i, "") || "PDF"} ${pageNumber}`,
        output,
        background: {
          src: canvas.toDataURL("image/png"),
          alt: `${file.name} page ${pageNumber}`,
          x: displayX,
          y: displayY,
          width: displayWidth,
          height: displayHeight,
        },
        textItems,
      });

      pages.push(editablePage.page);
      importedTextBlocks += editablePage.importedTextBlocks;
      importedImageBlocks += editablePage.importedImageBlocks;
      importedOutlineItems += editablePage.outlineItems.length;
    }
  } finally {
    await pdf.destroy();
  }

  if (pages.length === 0) {
    return {
      ok: false,
      message: "This PDF does not contain readable pages.",
    };
  }

  return {
    ok: true,
    pages,
    importedPages: pages.length,
    importedTextBlocks,
    importedImageBlocks,
    importedOutlineItems,
    truncated: totalPdfPages > maxPdfEditorImportPages,
  };
}

async function extractPdfEditableTextItems(input: {
  page: PdfPageProxy;
  viewport: PdfPageViewport;
  scale: number;
  offsetX: number;
  offsetY: number;
}): Promise<PdfEditableTextItem[]> {
  const content = (await input.page.getTextContent()) as PdfTextContent;

  return content.items
    .map((item) => normalizePdfTextItem(item, input))
    .filter((item): item is PdfEditableTextItem => Boolean(item));
}

function normalizePdfTextItem(
  item: unknown,
  input: {
    viewport: PdfPageViewport;
    scale: number;
    offsetX: number;
    offsetY: number;
  },
): PdfEditableTextItem | null {
  if (!isPdfTextContentItem(item)) return null;

  const text = item.str.replace(/\s+/g, " ").trim();

  if (!text) return null;

  const [viewportX, viewportY] = input.viewport.convertToViewportPoint(
    item.transform[4] ?? 0,
    item.transform[5] ?? 0,
  );
  const fontHeight = Math.max(
    item.height ?? 0,
    Math.hypot(item.transform[2] ?? 0, item.transform[3] ?? 0),
    Math.hypot(item.transform[0] ?? 0, item.transform[1] ?? 0),
    10,
  );
  const width = Math.max(
    8,
    (item.width ?? text.length * fontHeight * 0.5) * input.scale,
  );
  const height = Math.max(8, fontHeight * input.scale);

  return {
    text,
    x: input.offsetX + viewportX * input.scale,
    y: input.offsetY + viewportY * input.scale - height,
    width,
    height,
    fontSize: height,
    fontFamily: item.fontName,
  };
}

function isPdfTextContentItem(value: unknown): value is PdfTextContentItem {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<PdfTextContentItem>;

  return (
    typeof candidate.str === "string" &&
    Array.isArray(candidate.transform) &&
    candidate.transform.length >= 6
  );
}

function configurePdfWorker(options: { workerSrc: string }) {
  if (workerConfigured) return;

  options.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();
  workerConfigured = true;
}

type PdfPageProxy = {
  getTextContent: () => Promise<unknown>;
};

type PdfPageViewport = {
  width: number;
  height: number;
  convertToViewportPoint: (x: number, y: number) => number[];
};

type PdfTextContent = {
  items: unknown[];
};

type PdfTextContentItem = {
  str: string;
  transform: number[];
  width?: number;
  height?: number;
  fontName?: string;
};
