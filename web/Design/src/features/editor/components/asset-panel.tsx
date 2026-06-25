"use client";

import {
  ChartColumn,
  Clock3,
  FileText,
  FileSpreadsheet,
  GitBranch,
  ListChecks,
  Link2,
  PenLine,
  QrCode,
  Shapes,
  StickyNote,
  Table2,
  Type,
  Workflow,
} from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  getMaxAssetBytes,
  isAcceptedAssetMimeType,
  isAcceptedAudioMimeType,
  isAcceptedDocumentMimeType,
  isAcceptedImageMimeType,
  isAcceptedVideoMimeType,
} from "@/features/assets/asset-constraints";
import { readImageFile } from "@/features/assets/read-image-file";
import { readMediaFile } from "@/features/assets/read-media-file";
import {
  isSvgMimeType,
  readSvgFile,
  svgMimeType,
  svgTextFromDataUrl,
} from "@/features/assets/svg-assets";
import type { UserAssetSummary } from "@/features/assets/types";
import { AssetBrandAssetsPanel } from "@/features/editor/components/asset-brand-assets-panel";
import { AssetImportPanel } from "@/features/editor/components/asset-import-panel";
import type { AssetPanelMessage } from "@/features/editor/components/asset-panel-types";
import { AssetStockPanel } from "@/features/editor/components/asset-stock-panel";
import { AssetUploadPanel } from "@/features/editor/components/asset-upload-panel";
import { AssetUploadsPanel } from "@/features/editor/components/asset-uploads-panel";
import { AssetVectorPacksPanel } from "@/features/editor/components/asset-vector-packs-panel";
import { AudioLibraryPanel } from "@/features/editor/components/audio-library-panel";
import { createDashboardDataStoryElements } from "@/features/editor/data-story-elements";
import { DataVisualizationPanel } from "@/features/editor/components/data-visualization-panel";
import { MermaidDiagramPanel } from "@/features/editor/components/mermaid-diagram-panel";
import { ProjectKnowledgePackPanel } from "@/features/editor/components/project-knowledge-pack-panel";
import { StylePanel } from "@/features/editor/components/style-panel";
import {
  createChartElement,
  createAudioElement,
  createConnectorElement,
  createDocumentElement,
  createEmbedElement,
  createFormElement,
  createImageElement,
  createLottieElement,
  createPdfElement,
  createQrCodeElement,
  createShapeElement,
  createStickyNoteElement,
  createSvgElement,
  createTableElement,
  createTextElement,
  createTimerElement,
  createVectorPathElement,
  createVideoElement,
} from "@/features/editor/document-factory";
import { diagramPresets } from "@/features/editor/diagram-elements";
import { importCsvFileAsTable } from "@/features/editor/csv-import";
import { importPptxFileAsPages } from "@/features/editor/pptx-import";
import { importDocxFileAsPages } from "@/features/editor/office-docx-import";
import { importXlsxFileAsPages } from "@/features/editor/office-xlsx-import";
import { importPdfFileAsPages } from "@/features/editor/pdf-import";
import {
  createWebsiteLinkButtonElements,
  type WebsiteLinkButtonVariant,
} from "@/features/editor/website-link-blocks";
import {
  getLottieLayerSize,
  isLottieJsonFile,
  maxLottieJsonBytes,
  parseLottieAnimationText,
} from "@/features/editor/lottie-import";
import type { StylePreset } from "@/features/editor/style-presets";
import type { AudioLibraryItem } from "@/features/editor/audio-library";
import type {
  BrandColorSummary,
  BrandFontSummary,
  BrandLogoSummary,
  DesignDocument,
  DesignDocumentMetadata,
  DesignElement,
  DesignPage,
} from "@/features/editor/types";
import type { VectorPackItem } from "@/features/editor/vector-packs";

type AssetPanelProps = {
  assets: UserAssetSummary[];
  projectName: string;
  document: DesignDocument;
  brandColors: BrandColorSummary[];
  brandFonts: BrandFontSummary[];
  brandLogos: BrandLogoSummary[];
  onAddElement: (element: DesignElement) => void;
  onAddElements: (elements: DesignElement[]) => void;
  onAddPages: (pages: DesignPage[]) => void;
  onApplyStyle: (preset: StylePreset) => void;
  onApplyBrandKit: () => void;
  onUpdateMetadata: (updates: Partial<DesignDocumentMetadata>) => void;
};

type AssetLayerSource = {
  name: string;
  mimeType: string;
  dataUrl: string;
  width: number | null;
  height: number | null;
};

export function AssetPanel({
  assets: initialAssets,
  projectName,
  document,
  brandColors,
  brandFonts,
  brandLogos: initialBrandLogos,
  onAddElement,
  onAddElements,
  onAddPages,
  onApplyStyle,
  onApplyBrandKit,
  onUpdateMetadata,
}: AssetPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const docxInputRef = useRef<HTMLInputElement | null>(null);
  const xlsxInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const pptxInputRef = useRef<HTMLInputElement | null>(null);
  const lottieInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [assets, setAssets] = useState(initialAssets);
  const [brandLogos, setBrandLogos] = useState(initialBrandLogos);
  const [assetUploadError, setAssetUploadError] = useState<string | null>(null);
  const [csvImportMessage, setCsvImportMessage] =
    useState<AssetPanelMessage | null>(null);
  const [docxImportMessage, setDocxImportMessage] =
    useState<AssetPanelMessage | null>(null);
  const [xlsxImportMessage, setXlsxImportMessage] =
    useState<AssetPanelMessage | null>(null);
  const [pptxImportMessage, setPptxImportMessage] =
    useState<AssetPanelMessage | null>(null);
  const [pdfImportMessage, setPdfImportMessage] =
    useState<AssetPanelMessage | null>(null);
  const activePage =
    document.pages.find((page) => page.id === document.activePageId) ??
    document.pages[0];
  const [lottieImportMessage, setLottieImportMessage] =
    useState<AssetPanelMessage | null>(null);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [isImportingDocx, setIsImportingDocx] = useState(false);
  const [isImportingXlsx, setIsImportingXlsx] = useState(false);
  const [isImportingPdf, setIsImportingPdf] = useState(false);
  const [isImportingPptx, setIsImportingPptx] = useState(false);
  const [isImportingLottie, setIsImportingLottie] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    event.target.value = "";

    const mimeType = getAssetMimeType(file);

    if (!isAcceptedAssetMimeType(mimeType)) {
      setAssetUploadError(
        "Use PNG, JPG, WebP, GIF, SVG, PDF, MP4, WebM, OGG, MP3, WAV, M4A, or AAC.",
      );
      return;
    }

    if (file.size > getMaxAssetBytes(mimeType)) {
      setAssetUploadError(
        isAcceptedImageMimeType(mimeType)
          ? "Saved image uploads are limited to 2.5 MB for workspace storage."
          : "Saved media and PDF uploads are limited to 8 MB for workspace storage.",
      );
      return;
    }

    setIsUploadingAsset(true);
    setAssetUploadError(null);

    try {
      const asset = isSvgMimeType(mimeType)
        ? await readSvgFile(file)
        : isAcceptedImageMimeType(mimeType)
          ? await readImageFile(file)
          : await readMediaFile(file);
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: file.name,
          mimeType,
          dataUrl: asset.dataUrl,
          sizeBytes: file.size,
          width: asset.width,
          height: asset.height,
          sourceProvider: null,
          sourceUrl: null,
          authorName: null,
          licenseName: null,
          licenseUrl: null,
        }),
      });

      if (!response.ok) {
        setAssetUploadError(
          "Could not save this upload. Please try another file.",
        );
        return;
      }

      const body = (await response.json()) as { asset: UserAssetSummary };

      setAssets((current) => [body.asset, ...current]);
      addAssetToPage(body.asset);
    } catch {
      setAssetUploadError("Could not read this upload.");
    } finally {
      setIsUploadingAsset(false);
    }
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    event.target.value = "";

    const mimeType = getAssetMimeType(file);

    if (!isAcceptedImageMimeType(mimeType)) {
      setLogoUploadError("Use PNG, JPG, WebP, GIF, or SVG for brand logos.");
      return;
    }

    if (file.size > getMaxAssetBytes(mimeType)) {
      setLogoUploadError(
        "Brand logos are limited to 2.5 MB for workspace storage.",
      );
      return;
    }

    setIsUploadingLogo(true);
    setLogoUploadError(null);

    try {
      const image = isSvgMimeType(mimeType)
        ? await readSvgFile(file)
        : await readImageFile(file);
      const response = await fetch("/api/brand/logos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: file.name,
          mimeType,
          dataUrl: image.dataUrl,
          sizeBytes: file.size,
          width: image.width,
          height: image.height,
        }),
      });

      if (!response.ok) {
        setLogoUploadError(
          "Could not save this logo. Please try another image.",
        );
        return;
      }

      const body = (await response.json()) as { logo: BrandLogoSummary };

      setBrandLogos((current) => [body.logo, ...current]);
      addLayerFromSource(body.logo, "contain");
    } catch {
      setLogoUploadError("Could not read this logo.");
    } finally {
      setIsUploadingLogo(false);
    }
  }

  async function handleCsvImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    event.target.value = "";
    setIsImportingCsv(true);
    setCsvImportMessage(null);

    try {
      const result = await importCsvFileAsTable(file);

      if (!result.ok) {
        setCsvImportMessage({
          tone: "error",
          text: result.message,
        });
        return;
      }

      onAddElement(result.element);
      setCsvImportMessage({
        tone: "info",
        text: result.truncated
          ? `Imported ${result.importedRows} x ${result.importedColumns}; extra rows or columns were clipped.`
          : `Imported ${result.importedRows} x ${result.importedColumns} table.`,
      });
    } catch {
      setCsvImportMessage({
        tone: "error",
        text: "Could not read this CSV file.",
      });
    } finally {
      setIsImportingCsv(false);
    }
  }

  async function handlePptxImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    event.target.value = "";
    setIsImportingPptx(true);
    setPptxImportMessage(null);

    try {
      const result = await importPptxFileAsPages(file, {
        width: document.width,
        height: document.height,
      });

      if (!result.ok) {
        setPptxImportMessage({
          tone: "error",
          text: result.message,
        });
        return;
      }

      onAddPages(result.pages);
      setPptxImportMessage({
        tone: "info",
        text: result.truncated
          ? `Imported ${result.importedSlides} slides and ${result.importedElements} editable layers; extra slides were clipped.`
          : `Imported ${result.importedSlides} slides and ${result.importedElements} editable layers.`,
      });
    } catch {
      setPptxImportMessage({
        tone: "error",
        text: "Could not read this PPTX file.",
      });
    } finally {
      setIsImportingPptx(false);
    }
  }

  async function handleDocxImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    event.target.value = "";
    setIsImportingDocx(true);
    setDocxImportMessage(null);

    try {
      const result = await importDocxFileAsPages(file, {
        width: document.width,
        height: document.height,
      });

      if (!result.ok) {
        setDocxImportMessage({
          tone: "error",
          text: result.message,
        });
        return;
      }

      onAddPages(result.pages);
      setDocxImportMessage({
        tone: "info",
        text: result.truncated
          ? `Imported ${result.importedBlocks} DOCX blocks across ${result.importedPages} pages; extra content was clipped.`
          : `Imported ${result.importedBlocks} DOCX blocks across ${result.importedPages} pages.`,
      });
    } catch {
      setDocxImportMessage({
        tone: "error",
        text: "Could not read this DOCX file.",
      });
    } finally {
      setIsImportingDocx(false);
    }
  }

  async function handleXlsxImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    event.target.value = "";
    setIsImportingXlsx(true);
    setXlsxImportMessage(null);

    try {
      const result = await importXlsxFileAsPages(file, {
        width: document.width,
        height: document.height,
      });

      if (!result.ok) {
        setXlsxImportMessage({
          tone: "error",
          text: result.message,
        });
        return;
      }

      onAddPages(result.pages);
      setXlsxImportMessage({
        tone: "info",
        text: result.truncated
          ? `Imported ${result.importedSheets} sheets and ${result.importedRows} rows; extra workbook content was clipped.`
          : `Imported ${result.importedSheets} editable sheets and ${result.importedRows} rows.`,
      });
    } catch {
      setXlsxImportMessage({
        tone: "error",
        text: "Could not read this XLSX file.",
      });
    } finally {
      setIsImportingXlsx(false);
    }
  }

  async function handlePdfImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    event.target.value = "";
    setIsImportingPdf(true);
    setPdfImportMessage(null);

    try {
      const result = await importPdfFileAsPages(file, {
        width: document.width,
        height: document.height,
      });

      if (!result.ok) {
        setPdfImportMessage({
          tone: "error",
          text: result.message,
        });
        return;
      }

      onAddPages(result.pages);
      setPdfImportMessage({
        tone: "info",
        text: result.truncated
          ? `Imported ${result.importedPages} PDF pages with ${result.importedTextBlocks} editable text blocks and ${result.importedImageBlocks} page images; extra pages were clipped.`
          : `Imported ${result.importedPages} editable PDF pages with ${result.importedTextBlocks} text blocks, ${result.importedImageBlocks} page images, and ${result.importedOutlineItems} outline items.`,
      });
    } catch {
      setPdfImportMessage({
        tone: "error",
        text: "Could not render this PDF file.",
      });
    } finally {
      setIsImportingPdf(false);
    }
  }

  async function handleLottieImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    event.target.value = "";
    setIsImportingLottie(true);
    setLottieImportMessage(null);

    try {
      const mimeType = getAssetMimeType(file);

      if (!isLottieJsonFile(file, mimeType)) {
        setLottieImportMessage({
          tone: "error",
          text: "Use a Lottie JSON animation file.",
        });
        return;
      }

      if (file.size > maxLottieJsonBytes) {
        setLottieImportMessage({
          tone: "error",
          text: "Lottie JSON files are limited to 8 MB.",
        });
        return;
      }

      const text = await file.text();
      const parsed = parseLottieAnimationText(text);

      if (!parsed.ok) {
        setLottieImportMessage({
          tone: "error",
          text: parsed.message,
        });
        return;
      }

      const { width, height } = getLottieLayerSize(parsed);

      onAddElement(
        createLottieElement({
          name: file.name,
          lottieJson: parsed.normalizedJson,
          width,
          height,
        }),
      );
      setLottieImportMessage({
        tone: "info",
        text: "Imported editable Lottie animation.",
      });
    } catch {
      setLottieImportMessage({
        tone: "error",
        text: "Could not read this Lottie file.",
      });
    } finally {
      setIsImportingLottie(false);
    }
  }

  function addAssetToPage(asset: UserAssetSummary) {
    addLayerFromSource(asset, "cover");
  }

  function addImportedStockAsset(asset: UserAssetSummary) {
    setAssets((current) => [asset, ...current]);
    addAssetToPage(asset);
  }

  function addLayerFromSource(
    image: AssetLayerSource,
    objectFit: "cover" | "contain",
  ) {
    if (isSvgMimeType(image.mimeType)) {
      addSvgToPage(image);
      return;
    }

    if (isAcceptedVideoMimeType(image.mimeType)) {
      addVideoToPage(image, objectFit);
      return;
    }

    if (isAcceptedAudioMimeType(image.mimeType)) {
      addAudioToPage(image);
      return;
    }

    if (isAcceptedDocumentMimeType(image.mimeType)) {
      addPdfToPage(image);
      return;
    }

    addImageToPage(image, objectFit);
  }

  function addImageToPage(
    image: AssetLayerSource,
    objectFit: "cover" | "contain",
  ) {
    onAddElement(
      createImageElement({
        src: image.dataUrl,
        alt: image.name,
        width: image.width && image.height ? Math.min(420, image.width) : 360,
        height:
          image.width && image.height
            ? Math.round(
                (Math.min(420, image.width) / image.width) * image.height,
              )
            : 240,
        objectFit,
      }),
    );
  }

  function addVideoToPage(
    video: AssetLayerSource,
    objectFit: "cover" | "contain",
  ) {
    const width =
      video.width && video.height ? Math.min(560, video.width) : 520;
    const height =
      video.width && video.height
        ? Math.round((width / video.width) * video.height)
        : 292;

    onAddElement(
      createVideoElement({
        src: video.dataUrl,
        mimeType: video.mimeType,
        title: video.name,
        width,
        height,
        objectFit,
      }),
    );
  }

  function addAudioToPage(audio: AssetLayerSource) {
    onAddElement(
      createAudioElement({
        src: audio.dataUrl,
        mimeType: audio.mimeType,
        title: audio.name,
      }),
    );
  }

  function addAudioLibraryItem(item: AudioLibraryItem, dataUrl: string) {
    onAddElement(
      createAudioElement({
        src: dataUrl,
        mimeType: "audio/wav",
        title: item.name,
        timelineDurationSeconds: item.durationSeconds,
        sourceProvider: item.sourceProvider,
        sourceUrl: null,
        authorName: item.authorName,
        licenseName: item.licenseName,
        licenseUrl: item.licenseUrl,
        sourceBpm: item.bpm,
      }),
    );
  }

  function addPdfToPage(pdf: AssetLayerSource) {
    onAddElement(
      createPdfElement({
        src: pdf.dataUrl,
        mimeType: pdf.mimeType,
        title: pdf.name,
      }),
    );
  }

  function addSvgToPage(image: AssetLayerSource) {
    const svgText = svgTextFromDataUrl(image.dataUrl);

    if (!svgText) {
      setAssetUploadError("Could not read this SVG asset.");
      return;
    }

    const width =
      image.width && image.height ? Math.min(420, image.width) : 320;
    const height =
      image.width && image.height
        ? Math.round((width / image.width) * image.height)
        : 240;

    onAddElement(
      createSvgElement({
        name: image.name,
        svgText,
        width,
        height,
      }),
    );
  }

  function addVectorPackItem(item: VectorPackItem) {
    onAddElement(
      createSvgElement({
        name: item.name,
        svgText: item.svgText,
        width: item.width,
        height: item.height,
      }),
    );
  }

  function addDiagramPreset(presetId: string) {
    const preset = diagramPresets.find((item) => item.id === presetId);
    if (!preset) return;

    onAddElements(preset.createElements());
  }

  function addWebsiteLinkButton(variant: WebsiteLinkButtonVariant) {
    const pageWidth = activePage?.width ?? document.width;
    const width = Math.min(420, Math.max(280, Math.round(pageWidth * 0.38)));
    const x = Math.max(40, Math.round((pageWidth - width) / 2));

    onAddElements(
      createWebsiteLinkButtonElements({
        x,
        y: 160,
        width,
        label: variant === "primary" ? "Start now" : "Learn more",
        variant,
      }),
    );
  }

  return (
    <aside className="flex w-full min-w-0 shrink-0 flex-col overflow-x-hidden border-r border-border bg-card">
      <div className="p-3">
        <h2 className="text-sm font-semibold">Create</h2>
        <p className="sr-only">Add editable layers to the selected page.</p>
      </div>
      <Separator />
      <div className="grid min-w-0 grid-cols-1 gap-1.5 p-3 [&>*]:min-w-0 [&_button]:w-full [&_button]:min-w-0 [&_button]:overflow-hidden [&_svg]:shrink-0">
        <Button
          variant="outline"
          className="h-8 justify-start px-2 text-xs"
          onClick={() => onAddElement(createTextElement())}
        >
          <Type className="h-4 w-4" />
          Text
        </Button>
        <Button
          variant="outline"
          className="h-8 justify-start px-2 text-xs"
          onClick={() => onAddElement(createDocumentElement())}
        >
          <FileText className="h-4 w-4" />
          Document
        </Button>
        <Button
          variant="outline"
          className="h-8 justify-start px-2 text-xs"
          onClick={() =>
            onAddElement(createShapeElement({ shape: "rectangle" }))
          }
        >
          <Shapes className="h-4 w-4" />
          Rectangle
        </Button>
        <Button
          variant="outline"
          className="h-8 justify-start px-2 text-xs"
          onClick={() =>
            onAddElement(
              createShapeElement({ shape: "ellipse", fill: "#22c55e" }),
            )
          }
        >
          <Shapes className="h-4 w-4" />
          Ellipse
        </Button>
        <Button
          variant="outline"
          className="h-8 justify-start px-2 text-xs"
          onClick={() =>
            onAddElement(
              createShapeElement({
                shape: "line",
                fill: "transparent",
                stroke: "#111827",
                strokeWidth: 8,
                height: 24,
              }),
            )
          }
        >
          <Shapes className="h-4 w-4" />
          Line
        </Button>
        <Button
          variant="outline"
          className="h-8 justify-start px-2 text-xs"
          onClick={() => onAddElement(createStickyNoteElement())}
        >
          <StickyNote className="h-4 w-4" />
          Sticky note
        </Button>
        <Button
          variant="outline"
          className="h-8 justify-start px-2 text-xs"
          onClick={() => onAddElement(createConnectorElement())}
        >
          <GitBranch className="h-4 w-4" />
          Connector
        </Button>
        <Button
          variant="outline"
          className="h-8 justify-start px-2 text-xs"
          onClick={() => onAddElement(createVectorPathElement())}
        >
          <PenLine className="h-4 w-4" />
          Bezier path
        </Button>
        {diagramPresets.map((preset) => (
          <Button
            key={preset.id}
            variant="outline"
            className="h-8 justify-start px-2 text-xs"
            onClick={() => addDiagramPreset(preset.id)}
          >
            <Workflow className="h-4 w-4" />
            {preset.name}
          </Button>
        ))}
        {activePage ? (
          <MermaidDiagramPanel
            page={activePage}
            onAddElements={onAddElements}
          />
        ) : null}
        <Button
          variant="outline"
          className="h-8 justify-start px-2 text-xs"
          onClick={() => onAddElement(createQrCodeElement())}
        >
          <QrCode className="h-4 w-4" />
          QR code
        </Button>
        <Button
          variant="outline"
          className="h-8 justify-start px-2 text-xs"
          onClick={() => onAddElement(createTableElement())}
        >
          <Table2 className="h-4 w-4" />
          Table
        </Button>
        <Button
          variant="outline"
          className="h-8 justify-start px-2 text-xs"
          onClick={() => onAddElement(createChartElement())}
        >
          <ChartColumn className="h-4 w-4" />
          Chart
        </Button>
        <Button
          variant="outline"
          className="h-8 justify-start px-2 text-xs"
          onClick={() =>
            onAddElements(createDashboardDataStoryElements(document.width))
          }
        >
          <FileSpreadsheet className="h-4 w-4" />
          Data story
        </Button>
        <DataVisualizationPanel
          document={document}
          activePage={activePage}
          onAddElements={onAddElements}
        />
        <ProjectKnowledgePackPanel
          projectName={projectName}
          document={document}
          onUpdateMetadata={onUpdateMetadata}
        />
        <Button
          variant="outline"
          className="h-8 justify-start px-2 text-xs"
          onClick={() => onAddElement(createFormElement())}
        >
          <ListChecks className="h-4 w-4" />
          Form input
        </Button>
        <Button
          variant="outline"
          className="h-8 justify-start px-2 text-xs"
          onClick={() =>
            onAddElement(createFormElement({ fieldKind: "dropdown" }))
          }
        >
          <ListChecks className="h-4 w-4" />
          Dropdown
        </Button>
        <Button
          variant="outline"
          className="h-8 justify-start px-2 text-xs"
          onClick={() => onAddElement(createEmbedElement())}
        >
          <Link2 className="h-4 w-4" />
          Embed / link
        </Button>
        <Button
          variant="outline"
          className="h-8 justify-start px-2 text-xs"
          onClick={() => addWebsiteLinkButton("primary")}
        >
          <Link2 className="h-4 w-4" />
          Primary link button
        </Button>
        <Button
          variant="outline"
          className="h-8 justify-start px-2 text-xs"
          onClick={() => addWebsiteLinkButton("outline")}
        >
          <Link2 className="h-4 w-4" />
          Outline link button
        </Button>
        <Button
          variant="outline"
          className="h-8 justify-start px-2 text-xs"
          onClick={() => onAddElement(createTimerElement())}
        >
          <Clock3 className="h-4 w-4" />
          Timer
        </Button>
        <AssetImportPanel
          csvInputRef={csvInputRef}
          docxInputRef={docxInputRef}
          xlsxInputRef={xlsxInputRef}
          pdfInputRef={pdfInputRef}
          pptxInputRef={pptxInputRef}
          lottieInputRef={lottieInputRef}
          csvImportMessage={csvImportMessage}
          docxImportMessage={docxImportMessage}
          xlsxImportMessage={xlsxImportMessage}
          pdfImportMessage={pdfImportMessage}
          pptxImportMessage={pptxImportMessage}
          lottieImportMessage={lottieImportMessage}
          isImportingCsv={isImportingCsv}
          isImportingDocx={isImportingDocx}
          isImportingXlsx={isImportingXlsx}
          isImportingPdf={isImportingPdf}
          isImportingPptx={isImportingPptx}
          isImportingLottie={isImportingLottie}
          onCsvImport={handleCsvImport}
          onDocxImport={handleDocxImport}
          onXlsxImport={handleXlsxImport}
          onPdfImport={handlePdfImport}
          onPptxImport={handlePptxImport}
          onLottieImport={handleLottieImport}
        />
        <AssetUploadPanel
          fileInputRef={fileInputRef}
          isUploadingAsset={isUploadingAsset}
          assetUploadError={assetUploadError}
          onUpload={handleUpload}
        />
      </div>
      <Separator />
      <AssetStockPanel onImportAsset={addImportedStockAsset} />
      <Separator />
      <div className="p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">
            Music and SFX
          </h3>
          <span className="text-xs text-muted-foreground">CC0</span>
        </div>
        <AudioLibraryPanel onAddAudio={addAudioLibraryItem} />
      </div>
      <Separator />
      <AssetBrandAssetsPanel
        document={document}
        brandColors={brandColors}
        brandFonts={brandFonts}
        brandLogos={brandLogos}
        logoInputRef={logoInputRef}
        isUploadingLogo={isUploadingLogo}
        logoUploadError={logoUploadError}
        onApplyBrandKit={onApplyBrandKit}
        onLogoUpload={handleLogoUpload}
        onAddBrandLogo={(logo) => addLayerFromSource(logo, "contain")}
      />
      <Separator />
      <div className="p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">
            Styles
          </h3>
          <span className="text-xs text-muted-foreground">Page</span>
        </div>
        <StylePanel onApplyStyle={onApplyStyle} />
      </div>
      <Separator />
      <AssetVectorPacksPanel onAddVector={addVectorPackItem} />
      <Separator />
      <AssetUploadsPanel assets={assets} onAddAsset={addAssetToPage} />
    </aside>
  );
}

function getAssetMimeType(file: File) {
  if (file.type) return file.type;

  if (file.name.toLowerCase().endsWith(".svg")) return svgMimeType;
  if (file.name.toLowerCase().endsWith(".pdf")) return "application/pdf";
  if (file.name.toLowerCase().endsWith(".json")) return "application/json";
  if (file.name.toLowerCase().endsWith(".m4a")) return "audio/mp4";

  return "";
}
