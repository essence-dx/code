"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import {
  Box,
  Copy,
  FileJson,
  FilePlus2,
  Film,
  Frame,
  Globe2,
  ImageIcon,
  Layers3,
  PackageOpen,
  PenTool,
  Upload,
  Volume2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { materialPresets } from "../../materials/material-presets";
import { builtInSceneTemplates } from "../../scene/built-in-templates";
import { useEditorStore } from "../../store/editor-store";
import type {
  ModelSettings,
  PrimitiveKind,
  SceneComponent,
  SceneDocument,
  SplineSettings,
} from "../../types";
import { createModelImportDiagnostics } from "../../utils/cad-conversion-validation";
import {
  analyzeCadImportFile,
  type CadConversionPlan,
} from "../../utils/cad-import-preflight";
import { createFigmaPreviewFromUrl } from "../../utils/figma-preview";
import { getFileExtension, readFileAsDataUrl } from "../../utils/file-readers";
import { AssetCleanupPanel } from "./asset-cleanup-panel";
import { AudioAssetLibrarySection } from "./audio-asset-library-section";
import { BuiltInTemplateLibrarySection } from "./built-in-template-library-section";
import { ComponentLibrarySection } from "./component-library-section";
import { ExportOptimizationPanel } from "./export-optimization-panel";
import { ExportReadinessPanel } from "./export-readiness-panel";
import { MaterialAssetLibrarySection } from "./material-asset-library-section";
import { ScenePerformanceProfilerPanel } from "./scene-performance-profiler-panel";
import { TextureOptimizationPanel } from "./texture-optimization-panel";

const assetBuckets = [
  { label: "Primitives", count: 9, icon: Box },
  { label: "Lights", count: 3, icon: Layers3 },
  { label: "Cameras", count: 1, icon: Layers3 },
  { label: "Groups", count: 1, icon: Layers3 },
  { label: "Materials", count: materialPresets.length, icon: Layers3 },
  { label: "Video", count: 0, icon: Film },
  { label: "Scene JSON", count: 1, icon: FileJson },
];

const maxModelBytes = 12 * 1024 * 1024;
const maxSplatBytes = 32 * 1024 * 1024;
const maxImageBytes = 8 * 1024 * 1024;
const maxVideoBytes = 24 * 1024 * 1024;
const maxAudioBytes = 16 * 1024 * 1024;
const maxSvgBytes = 4 * 1024 * 1024;
const emptyComponents: SceneComponent[] = [];

interface SplineImportCapabilities {
  environmentKeys: string[];
  privateEditorFileImport: boolean;
  publicExportImport: boolean;
}

interface SplineProjectOpenResponse {
  document?: SceneDocument;
  error?: string;
  importSource?: {
    bridge?: "authorized-exporter" | "none";
    inputKind?: "private-editor-file" | "public-export";
  };
  primaryObjectId?: string;
  spline?: SplineSettings;
}

function supportsMaterial(kind: PrimitiveKind) {
  return (
    kind !== "pointLight" &&
    kind !== "directionalLight" &&
    kind !== "spotLight" &&
    kind !== "camera" &&
    kind !== "group" &&
    kind !== "model" &&
    kind !== "image" &&
    kind !== "video" &&
    kind !== "audio" &&
    kind !== "svg" &&
    kind !== "figma" &&
    kind !== "spline"
  );
}

function formatMegabytes(bytes: number) {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

function getModelFormat(
  extension: string,
): NonNullable<ModelSettings["format"]> {
  if (extension === "obj") {
    return "obj";
  }

  if (extension === "stl") {
    return "stl";
  }

  if (extension === "splat") {
    return "splat";
  }

  return "gltf";
}

function readImageDimensions(sourceDataUrl: string) {
  return new Promise<{ height: number; width: number }>((resolve) => {
    const image = new Image();
    image.onload = () =>
      resolve({
        height: image.naturalHeight || 1,
        width: image.naturalWidth || 1,
      });
    image.onerror = () => resolve({ height: 1, width: 1 });
    image.src = sourceDataUrl;
  });
}

function fitImageSize(width: number, height: number) {
  const aspectRatio = Math.max(width, 1) / Math.max(height, 1);
  const maxSize = 2.8;

  return aspectRatio >= 1
    ? { width: maxSize, height: maxSize / aspectRatio }
    : { width: maxSize * aspectRatio, height: maxSize };
}

function parseSvgMetadata(text: string) {
  const documentElement = new DOMParser().parseFromString(
    text,
    "image/svg+xml",
  ).documentElement;
  const viewBox = documentElement
    .getAttribute("viewBox")
    ?.split(/[\s,]+/)
    .map(Number)
    .filter(Number.isFinite);
  const width = Number.parseFloat(documentElement.getAttribute("width") ?? "");
  const height = Number.parseFloat(
    documentElement.getAttribute("height") ?? "",
  );
  const viewBoxMinX = viewBox?.[0] ?? 0;
  const viewBoxMinY = viewBox?.[1] ?? 0;
  const rawWidth = viewBox?.[2] ?? (Number.isFinite(width) ? width : 100);
  const rawHeight = viewBox?.[3] ?? (Number.isFinite(height) ? height : 100);
  const viewBoxWidth = Math.max(rawWidth, 0.01);
  const viewBoxHeight = Math.max(rawHeight, 0.01);

  return {
    ...fitImageSize(viewBoxWidth, viewBoxHeight),
    viewBoxMinX,
    viewBoxMinY,
    viewBoxWidth,
    viewBoxHeight,
  };
}

function readVideoDimensions(sourceDataUrl: string) {
  return new Promise<{ height: number; width: number }>((resolve) => {
    const video = document.createElement("video");
    video.onloadedmetadata = () =>
      resolve({ height: video.videoHeight || 1, width: video.videoWidth || 1 });
    video.onerror = () => resolve({ height: 1, width: 1 });
    video.preload = "metadata";
    video.src = sourceDataUrl;
  });
}

export function AssetPanel() {
  const [modelMessage, setModelMessage] = useState<string | null>(null);
  const [cadConversionPlan, setCadConversionPlan] =
    useState<CadConversionPlan | null>(null);
  const [imageMessage, setImageMessage] = useState<string | null>(null);
  const [videoMessage, setVideoMessage] = useState<string | null>(null);
  const [audioMessage, setAudioMessage] = useState<string | null>(null);
  const [svgMessage, setSvgMessage] = useState<string | null>(null);
  const [figmaMessage, setFigmaMessage] = useState<string | null>(null);
  const [figmaUrl, setFigmaUrl] = useState("");
  const [splineMessage, setSplineMessage] = useState<string | null>(null);
  const [splineInput, setSplineInput] = useState("");
  const [splineImportCapabilities, setSplineImportCapabilities] =
    useState<SplineImportCapabilities | null>(null);
  const [splinePending, setSplinePending] = useState(false);
  const document = useEditorStore((state) => state.document);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const components = useEditorStore(
    (state) => state.document.components ?? emptyComponents,
  );
  const materialAssetCount = useEditorStore(
    (state) => state.document.materialAssets?.length ?? 0,
  );
  const audioAssetCount = useEditorStore(
    (state) => state.document.audioAssets?.length ?? 0,
  );
  const textureCount = useEditorStore(
    (state) =>
      state.document.objects.filter((object) => object.material.textureDataUrl)
        .length,
  );
  const modelCount = useEditorStore(
    (state) =>
      state.document.objects.filter((object) => object.kind === "model").length,
  );
  const imageCount = useEditorStore(
    (state) =>
      state.document.objects.filter((object) => object.kind === "image").length,
  );
  const videoCount = useEditorStore(
    (state) =>
      state.document.objects.filter((object) => object.kind === "video").length,
  );
  const audioCount = useEditorStore(
    (state) =>
      state.document.objects.filter((object) => object.kind === "audio").length,
  );
  const svgCount = useEditorStore(
    (state) =>
      state.document.objects.filter((object) => object.kind === "svg").length,
  );
  const figmaCount = useEditorStore(
    (state) =>
      state.document.objects.filter((object) => object.kind === "figma").length,
  );
  const splineCount = useEditorStore(
    (state) =>
      state.document.objects.filter((object) => object.kind === "spline")
        .length,
  );
  const selectedObject = useEditorStore((state) =>
    state.document.objects.find((object) => object.id === selectedObjectId),
  );
  const updateMaterial = useEditorStore((state) => state.updateMaterial);
  const addModelObject = useEditorStore((state) => state.addModelObject);
  const addImageObject = useEditorStore((state) => state.addImageObject);
  const addVideoObject = useEditorStore((state) => state.addVideoObject);
  const addAudioObject = useEditorStore((state) => state.addAudioObject);
  const addSvgObject = useEditorStore((state) => state.addSvgObject);
  const addFigmaObject = useEditorStore((state) => state.addFigmaObject);
  const addSplineObject = useEditorStore((state) => state.addSplineObject);
  const replaceDocument = useEditorStore((state) => state.replaceDocument);
  const canApplyMaterial = selectedObject
    ? supportsMaterial(selectedObject.kind)
    : false;
  const buckets = [
    assetBuckets[0],
    { label: "Models", count: modelCount, icon: PackageOpen },
    {
      label: "Templates",
      count: builtInSceneTemplates.length,
      icon: PackageOpen,
    },
    { label: "Components", count: components.length, icon: Layers3 },
    ...assetBuckets.slice(1, 5),
    { label: "Saved Materials", count: materialAssetCount, icon: Layers3 },
    { label: "Images", count: imageCount + textureCount, icon: ImageIcon },
    { label: "SVG", count: svgCount, icon: PenTool },
    { label: "Figma", count: figmaCount, icon: Frame },
    { label: "Spline", count: splineCount, icon: Globe2 },
    { label: "Video", count: videoCount, icon: Film },
    { label: "Audio", count: audioCount, icon: Volume2 },
    { label: "Saved Audio", count: audioAssetCount, icon: Volume2 },
    assetBuckets[6],
  ];

  useEffect(() => {
    let active = true;

    async function loadSplineImportCapabilities() {
      try {
        const response = await fetch("/api/spline/import/capabilities", {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          capabilities?: SplineImportCapabilities;
        };

        if (active && response.ok && payload.capabilities) {
          setSplineImportCapabilities(payload.capabilities);
        }
      } catch {
        if (active) {
          setSplineImportCapabilities(null);
        }
      }
    }

    void loadSplineImportCapabilities();

    return () => {
      active = false;
    };
  }, []);

  async function handleModelUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    const extension = getFileExtension(file.name);
    const preflight = analyzeCadImportFile(file);

    if (preflight.status !== "importable") {
      setCadConversionPlan(preflight.conversionPlan ?? null);
      setModelMessage(`${preflight.title}. ${preflight.detail}`);
      return;
    }

    setCadConversionPlan(null);

    const format = getModelFormat(extension);
    const maxBytes = format === "splat" ? maxSplatBytes : maxModelBytes;

    if (file.size > maxBytes) {
      setModelMessage(
        `${format === "splat" ? "Splat asset" : "Model"} must be ${formatMegabytes(maxBytes)} or smaller. ${preflight.detail}`,
      );
      return;
    }

    try {
      const sourceDataUrl = await readFileAsDataUrl(file, "Model");
      addModelObject({
        animationAutoPlay:
          format === "gltf" && (extension === "glb" || extension === "gltf"),
        animationLoop: true,
        animationSpeed: 1,
        fileName: file.name,
        format,
        morphTargetAutoPlay: false,
        morphTargetIndex: 0,
        morphTargetSpeed: 1,
        morphTargetWeight: 0,
        importDiagnostics: preflight.validation
          ? createModelImportDiagnostics(format, preflight.validation)
          : undefined,
        splatAlphaHash: false,
        splatAlphaTest: 0,
        splatPointScale: 1,
        splatToneMapped: false,
        sourceDataUrl,
      });
      setModelMessage(`${file.name} imported. ${preflight.detail}`);
    } catch (error) {
      setModelMessage(
        error instanceof Error ? error.message : "Model import failed.",
      );
    }
  }

  async function handleCopyCadConversionCommand() {
    const command = cadConversionPlan?.commands[0];

    if (!command) {
      return;
    }

    try {
      await navigator.clipboard.writeText(command.command);
      setModelMessage(
        `Copied ${command.label}. Run it beside the source file, then import the generated ${command.target.toUpperCase()}.`,
      );
    } catch {
      setModelMessage(command.command);
    }
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    if (getFileExtension(file.name) === "svg") {
      setImageMessage("Use SVG import for vector files.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setImageMessage("Choose an image file.");
      return;
    }

    if (file.size > maxImageBytes) {
      setImageMessage("Image must be 8 MB or smaller.");
      return;
    }

    try {
      const sourceDataUrl = await readFileAsDataUrl(file, "Image");
      const dimensions = await readImageDimensions(sourceDataUrl);
      addImageObject({
        fileName: file.name,
        sourceDataUrl,
        ...fitImageSize(dimensions.width, dimensions.height),
      });
      setImageMessage(`${file.name} imported.`);
    } catch (error) {
      setImageMessage(
        error instanceof Error ? error.message : "Image import failed.",
      );
    }
  }

  async function handleVideoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("video/")) {
      setVideoMessage("Choose a video file.");
      return;
    }

    if (file.size > maxVideoBytes) {
      setVideoMessage("Video must be 24 MB or smaller.");
      return;
    }

    try {
      const sourceDataUrl = await readFileAsDataUrl(file, "Video");
      const dimensions = await readVideoDimensions(sourceDataUrl);
      addVideoObject({
        fileName: file.name,
        sourceDataUrl,
        ...fitImageSize(dimensions.width, dimensions.height),
        loop: true,
        muted: true,
      });
      setVideoMessage(`${file.name} imported.`);
    } catch (error) {
      setVideoMessage(
        error instanceof Error ? error.message : "Video import failed.",
      );
    }
  }

  async function handleAudioUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("audio/")) {
      setAudioMessage("Choose an audio file.");
      return;
    }

    if (file.size > maxAudioBytes) {
      setAudioMessage("Audio must be 16 MB or smaller.");
      return;
    }

    try {
      const sourceDataUrl = await readFileAsDataUrl(file, "Audio");
      addAudioObject({
        fileName: file.name,
        sourceDataUrl,
        autoplay: false,
        loop: false,
        muted: false,
        volume: 0.8,
      });
      setAudioMessage(`${file.name} imported.`);
    } catch (error) {
      setAudioMessage(
        error instanceof Error ? error.message : "Audio import failed.",
      );
    }
  }

  async function handleSvgUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    if (getFileExtension(file.name) !== "svg") {
      setSvgMessage("Choose an SVG file.");
      return;
    }

    if (file.size > maxSvgBytes) {
      setSvgMessage("SVG must be 4 MB or smaller.");
      return;
    }

    try {
      const sourceText = await file.text();
      const sourceDataUrl = await readFileAsDataUrl(file, "SVG");
      addSvgObject({
        fileName: file.name,
        sourceDataUrl,
        ...parseSvgMetadata(sourceText),
      });
      setSvgMessage(`${file.name} imported.`);
    } catch (error) {
      setSvgMessage(
        error instanceof Error ? error.message : "SVG import failed.",
      );
    }
  }

  function handleFigmaPreviewCreate() {
    try {
      const preview = createFigmaPreviewFromUrl(figmaUrl);
      addFigmaObject(preview);
      setFigmaUrl("");
      setFigmaMessage(`${preview.name} added.`);
    } catch (error) {
      setFigmaMessage(
        error instanceof Error
          ? error.message
          : "Figma preview could not be added.",
      );
    }
  }

  async function handleSplineImportCreate() {
    const input = splineInput.trim();

    if (!input) {
      setSplineMessage(
        "Paste a Spline public URL, Viewer embed snippet, Code export URL, or API payload.",
      );
      return;
    }

    setSplinePending(true);

    try {
      const response = await fetch("/api/spline/import/resolve", {
        body: JSON.stringify({ input }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        spline?: SplineSettings;
      };

      if (!response.ok || !payload.spline) {
        throw new Error(
          payload.error ?? "Spline import could not be resolved.",
        );
      }

      addSplineObject(payload.spline);
      setSplineInput("");
      setSplineMessage(
        `${payload.spline.name} opened as a ${payload.spline.renderMode === "spline-viewer" ? "Spline Viewer" : "public URL"} surface.`,
      );
    } catch (error) {
      setSplineMessage(
        error instanceof Error
          ? error.message
          : "Spline import could not be resolved.",
      );
    } finally {
      setSplinePending(false);
    }
  }

  async function handleSplineProjectOpen() {
    const input = splineInput.trim();

    if (!input) {
      setSplineMessage(
        "Paste a Spline public URL, Viewer embed snippet, Code export URL, or API payload.",
      );
      return;
    }

    setSplinePending(true);

    try {
      const response = await fetch("/api/spline/import/open", {
        body: JSON.stringify({ input }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as SplineProjectOpenResponse;

      if (!response.ok || !payload.document || !payload.spline) {
        throw new Error(
          payload.error ?? "Spline project import could not be resolved.",
        );
      }

      replaceDocument(payload.document, payload.primaryObjectId ?? null);
      setSplineInput("");
      setSplineMessage(
        `${payload.spline.name} opened as the active project document${payload.importSource?.bridge === "authorized-exporter" ? " through the private export bridge" : ""}.`,
      );
    } catch (error) {
      setSplineMessage(
        error instanceof Error
          ? error.message
          : "Spline project import could not be resolved.",
      );
    } finally {
      setSplinePending(false);
    }
  }

  return (
    <section className="grid min-h-0 grid-rows-[40px_1fr]">
      <div className="flex items-center px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Assets
      </div>
      <ScrollArea className="min-h-0">
        <div className="space-y-3 p-2">
          {buckets.map((bucket) => {
            const Icon = bucket.icon;

            return (
              <div
                key={bucket.label}
                className="flex items-center justify-between rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{bucket.label}</span>
                </div>
                <Badge className="rounded-md text-[11px]" variant="secondary">
                  {bucket.count}
                </Badge>
              </div>
            );
          })}

          <ScenePerformanceProfilerPanel document={document} />
          <ExportOptimizationPanel document={document} />
          <ExportReadinessPanel document={document} />
          <TextureOptimizationPanel />
          <AssetCleanupPanel />
          <BuiltInTemplateLibrarySection />

          <div className="space-y-2 rounded-md border border-border p-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                <Globe2 className="size-4 shrink-0" />
                <span className="truncate">Open Spline project</span>
              </div>
              <Badge className="rounded-md text-[11px]" variant="secondary">
                API
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1">
              <Badge
                className="rounded-md text-[11px]"
                variant={
                  splineImportCapabilities?.publicExportImport === false
                    ? "destructive"
                    : "secondary"
                }
              >
                Public exports on
              </Badge>
              <Badge
                className="rounded-md text-[11px]"
                variant={
                  splineImportCapabilities?.privateEditorFileImport
                    ? "secondary"
                    : "outline"
                }
              >
                Private bridge{" "}
                {splineImportCapabilities?.privateEditorFileImport
                  ? "on"
                  : "off"}
              </Badge>
            </div>
            <Label className="sr-only" htmlFor="spline-project-input">
              Spline public URL, Viewer embed snippet, Code export URL, or API
              payload
            </Label>
            <div className="grid gap-2">
              <Textarea
                id="spline-project-input"
                className="min-h-20 resize-none"
                placeholder="https://prod.spline.design/.../scene.splinecode or <spline-viewer url=...>"
                value={splineInput}
                onChange={(event) => setSplineInput(event.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="min-w-0"
                  disabled={splinePending}
                  size="sm"
                  type="button"
                  variant="secondary"
                  onClick={handleSplineImportCreate}
                >
                  <Globe2 className="size-3.5" />
                  {splinePending ? "Resolving" : "As surface"}
                </Button>
                <Button
                  className="min-w-0"
                  disabled={splinePending}
                  size="sm"
                  type="button"
                  variant="default"
                  onClick={handleSplineProjectOpen}
                >
                  <FilePlus2 className="size-3.5" />
                  {splinePending ? "Resolving" : "As project"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Opens public Spline exports as live surfaces or documents. Private
              editor files need the server-to-server export bridge and caller
              token.
              {!splineImportCapabilities?.privateEditorFileImport &&
              splineImportCapabilities?.environmentKeys?.length
                ? ` Missing ${splineImportCapabilities.environmentKeys.join(" and ")}.`
                : null}
            </p>
            {splineMessage ? (
              <p className="text-xs text-muted-foreground">{splineMessage}</p>
            ) : null}
          </div>

          <div className="space-y-2 rounded-md border border-border p-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                <Frame className="size-4 shrink-0" />
                <span className="truncate">Add Figma preview</span>
              </div>
              <Badge className="rounded-md text-[11px]" variant="secondary">
                URL
              </Badge>
            </div>
            <Label className="sr-only" htmlFor="figma-preview-url">
              Figma preview URL
            </Label>
            <div className="grid gap-2">
              <Input
                id="figma-preview-url"
                placeholder="https://www.figma.com/design/..."
                value={figmaUrl}
                onChange={(event) => setFigmaUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleFigmaPreviewCreate();
                  }
                }}
              />
              <Button
                className="w-full"
                size="sm"
                type="button"
                variant="secondary"
                onClick={handleFigmaPreviewCreate}
              >
                Add preview
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Places a live Figma embed surface into the scene.
            </p>
            {figmaMessage ? (
              <p className="text-xs text-muted-foreground">{figmaMessage}</p>
            ) : null}
          </div>

          <div className="space-y-2 rounded-md border border-border p-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                <Upload className="size-4 shrink-0" />
                <span className="truncate">Import model</span>
              </div>
              <Badge className="rounded-md text-[11px]" variant="secondary">
                GLB/OBJ/SPLAT
              </Badge>
            </div>
            <Label className="sr-only" htmlFor="model-upload">
              Import GLB, GLTF, OBJ, STL, or SPLAT model
            </Label>
            <Input
              id="model-upload"
              accept=".glb,.gltf,.obj,.stl,.splat,.step,.stp,.iges,.igs,.brep,.sat,.sab,.3dm,.fbx,.dae,.ifc,.usd,.usdc,.3ds,.3mf,model/gltf-binary,model/gltf+json,text/plain"
              type="file"
              onChange={handleModelUpload}
            />
            <p className="text-xs text-muted-foreground">
              Direct import supports GLB, GLTF, OBJ, STL, and SPLAT. CAD and
              exchange sources produce a local conversion plan first.
            </p>
            {modelMessage ? (
              <p className="text-xs text-muted-foreground">{modelMessage}</p>
            ) : null}
            {cadConversionPlan ? (
              <div className="space-y-2 border-t border-border pt-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      Convert to{" "}
                      {cadConversionPlan.preferredTarget.toUpperCase()}
                    </p>
                    <p className="text-muted-foreground">
                      {cadConversionPlan.summary}
                    </p>
                  </div>
                  <Button
                    className="h-8 shrink-0 gap-1 px-2"
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={handleCopyCadConversionCommand}
                  >
                    <Copy className="size-3.5" />
                    Copy
                  </Button>
                </div>
                <code className="block break-all rounded bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
                  {cadConversionPlan.commands[0]?.command}
                </code>
                <div className="grid grid-cols-3 gap-1">
                  <div className="rounded border border-border px-2 py-1">
                    <span className="block font-mono text-[11px] text-foreground">
                      {cadConversionPlan.validation.unitMetadata.sourceUnit}
                    </span>
                    <span className="text-muted-foreground">Units</span>
                  </div>
                  <div className="rounded border border-border px-2 py-1">
                    <span className="block font-mono text-[11px] text-foreground">
                      {cadConversionPlan.validation.tessellationBudget.estimatedTriangleCount.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">Triangles</span>
                  </div>
                  <div className="rounded border border-border px-2 py-1">
                    <span className="block font-mono text-[11px] text-foreground">
                      {cadConversionPlan.validation.meshDiagnostics.complexity}
                    </span>
                    <span className="text-muted-foreground">Complexity</span>
                  </div>
                </div>
                <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                  {cadConversionPlan.checklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                  {cadConversionPlan.validation.issues.map((issue) => (
                    <li key={issue.id}>{issue.detail}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="space-y-2 rounded-md border border-border p-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                <PenTool className="size-4 shrink-0" />
                <span className="truncate">Import SVG</span>
              </div>
              <Badge className="rounded-md text-[11px]" variant="secondary">
                Vector
              </Badge>
            </div>
            <Label className="sr-only" htmlFor="svg-upload">
              Import SVG vector object
            </Label>
            <Input
              id="svg-upload"
              accept=".svg,image/svg+xml"
              type="file"
              onChange={handleSvgUpload}
            />
            <p className="text-xs text-muted-foreground">
              Rendered as editable vector geometry, 4 MB max.
            </p>
            {svgMessage ? (
              <p className="text-xs text-muted-foreground">{svgMessage}</p>
            ) : null}
          </div>

          <div className="space-y-2 rounded-md border border-border p-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                <ImageIcon className="size-4 shrink-0" />
                <span className="truncate">Import image</span>
              </div>
              <Badge className="rounded-md text-[11px]" variant="secondary">
                PNG/JPG/SVG
              </Badge>
            </div>
            <Label className="sr-only" htmlFor="image-upload">
              Import image object
            </Label>
            <Input
              id="image-upload"
              accept="image/*"
              type="file"
              onChange={handleImageUpload}
            />
            <p className="text-xs text-muted-foreground">
              Placed as a selectable image plane, 8 MB max.
            </p>
            {imageMessage ? (
              <p className="text-xs text-muted-foreground">{imageMessage}</p>
            ) : null}
          </div>

          <div className="space-y-2 rounded-md border border-border p-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                <Film className="size-4 shrink-0" />
                <span className="truncate">Import video</span>
              </div>
              <Badge className="rounded-md text-[11px]" variant="secondary">
                MP4/WebM
              </Badge>
            </div>
            <Label className="sr-only" htmlFor="video-upload">
              Import video object
            </Label>
            <Input
              id="video-upload"
              accept="video/mp4,video/webm,video/ogg"
              type="file"
              onChange={handleVideoUpload}
            />
            <p className="text-xs text-muted-foreground">
              Placed as a looping video plane, 24 MB max.
            </p>
            {videoMessage ? (
              <p className="text-xs text-muted-foreground">{videoMessage}</p>
            ) : null}
          </div>

          <div className="space-y-2 rounded-md border border-border p-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                <Volume2 className="size-4 shrink-0" />
                <span className="truncate">Import audio</span>
              </div>
              <Badge className="rounded-md text-[11px]" variant="secondary">
                MP3/WAV
              </Badge>
            </div>
            <Label className="sr-only" htmlFor="audio-upload">
              Import audio object
            </Label>
            <Input
              id="audio-upload"
              accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac"
              type="file"
              onChange={handleAudioUpload}
            />
            <p className="text-xs text-muted-foreground">
              Placed as a selectable sound marker, 16 MB max.
            </p>
            {audioMessage ? (
              <p className="text-xs text-muted-foreground">{audioMessage}</p>
            ) : null}
          </div>

          <ComponentLibrarySection />
          <AudioAssetLibrarySection />
          <MaterialAssetLibrarySection />

          <div className="space-y-1 pt-1">
            <div className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Material Presets
            </div>
            {materialPresets.map((preset) => (
              <Button
                key={preset.id}
                className={cn(
                  "grid h-auto w-full grid-cols-[24px_1fr] justify-start gap-2 px-2 py-2 text-left",
                  canApplyMaterial
                    ? "text-muted-foreground hover:bg-accent hover:text-foreground"
                    : "cursor-not-allowed text-muted-foreground/50",
                )}
                disabled={!canApplyMaterial || !selectedObject}
                type="button"
                variant="ghost"
                onClick={() =>
                  selectedObject &&
                  updateMaterial(selectedObject.id, preset.material)
                }
              >
                <span
                  className="size-5 rounded border border-border"
                  style={{ backgroundColor: preset.material.color }}
                />
                <span className="min-w-0">
                  <span className="block truncate">{preset.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {preset.description}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        </div>
      </ScrollArea>
      <Separator />
    </section>
  );
}
