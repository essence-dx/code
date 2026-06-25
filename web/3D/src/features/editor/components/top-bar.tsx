"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Box,
  Camera,
  ChevronDown,
  Command,
  Cuboid,
  Download,
  Eye,
  FileJson,
  Film,
  FolderOpen,
  ImageIcon,
  Images,
  Layers3,
  Play,
  Printer,
  Redo2,
  RefreshCw,
  RotateCcw,
  Save,
  Square,
  Type,
  Undo2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ProjectCloudPanel } from "@/features/projects/components/project-cloud-panel";
import { IconButton } from "./icon-button";
import { useEditorStore } from "../store/editor-store";
import { type PrimitiveKind } from "../types";
import {
  exportDesktopViewportImage,
  installDesktopUpdate,
  isDesktopRuntime,
  openDesktopSceneDocument,
  readStartupDesktopSceneDocument,
  saveDesktopSceneDocument,
} from "../utils/desktop-io";
import {
  getExportReadinessNotice,
  type ExportReadinessFormat,
} from "../utils/export-manifest";
import {
  downloadScene,
  exportSceneGlb,
  exportSceneManifest,
  exportSceneStl,
  exportSceneUsdz,
  exportViewportImage,
  exportViewportImageSequence,
  exportViewportVideo,
  readSceneFile,
} from "../utils/scene-io";

const primitiveLabels: Record<PrimitiveKind, string> = {
  box: "Cube",
  sphere: "Sphere",
  cylinder: "Cylinder",
  cone: "Cone",
  torus: "Torus",
  plane: "Plane",
  rectangle: "Rectangle",
  ellipse: "Ellipse",
  triangle: "Triangle",
  star: "Star",
  text: "Text",
  model: "Model",
  image: "Image",
  video: "Video",
  audio: "Audio",
  svg: "SVG",
  figma: "Figma",
  spline: "Spline",
  path: "Path",
  particles: "Particles",
  pointLight: "Point Light",
  directionalLight: "Directional Light",
  spotLight: "Spot Light",
  camera: "Camera",
  group: "Group",
};

type IconComponent = typeof Box;

const mediaObjectKinds: PrimitiveKind[] = [
  "model",
  "image",
  "video",
  "audio",
  "svg",
  "figma",
  "spline",
];

const createMenuGroups: Array<{ label: string; kinds: PrimitiveKind[] }> = [
  {
    label: "3D",
    kinds: ["box", "sphere", "cylinder", "cone", "torus", "plane"],
  },
  {
    label: "2D and vector",
    kinds: ["rectangle", "ellipse", "triangle", "star", "text", "path"],
  },
  {
    label: "Scene",
    kinds: [
      "particles",
      "pointLight",
      "directionalLight",
      "spotLight",
      "camera",
      "group",
    ],
  },
];

function MenuButton({
  children,
  icon: Icon,
  label,
}: {
  children: ReactNode;
  icon: IconComponent;
  label: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button className="h-8 gap-1.5 px-2.5" size="sm" variant="ghost">
            <Icon className="size-4" />
            <span className="hidden sm:inline">{label}</span>
            <ChevronDown className="size-3.5 opacity-70" />
          </Button>
        }
      >
        <span className="sr-only">{label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuAction({
  disabled,
  icon: Icon,
  label,
  onSelect,
}: {
  disabled?: boolean;
  icon: IconComponent;
  label: string;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem disabled={disabled} onClick={onSelect}>
      <Icon className="size-4" />
      {label}
    </DropdownMenuItem>
  );
}

function MenuSection({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>{label}</DropdownMenuLabel>
      {children}
    </DropdownMenuGroup>
  );
}

type TopBarProps = {
  cloudEnabled?: boolean;
};

export function TopBar({ cloudEnabled = true }: TopBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const startupSceneLoadedRef = useRef(false);
  const document = useEditorStore((state) => state.document);
  const setDocumentName = useEditorStore((state) => state.setDocumentName);
  const addObject = useEditorStore((state) => state.addObject);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const resetDocument = useEditorStore((state) => state.resetDocument);
  const loadDocument = useEditorStore((state) => state.loadDocument);
  const setCommandPaletteOpen = useEditorStore(
    (state) => state.setCommandPaletteOpen,
  );
  const cameraPreviewEnabled = useEditorStore(
    (state) => state.cameraPreviewEnabled,
  );
  const setCameraPreviewEnabled = useEditorStore(
    (state) => state.setCameraPreviewEnabled,
  );
  const playModeEnabled = useEditorStore((state) => state.playModeEnabled);
  const setPlayModeEnabled = useEditorStore(
    (state) => state.setPlayModeEnabled,
  );

  useEffect(() => {
    if (!isDesktopRuntime() || startupSceneLoadedRef.current) {
      return;
    }

    startupSceneLoadedRef.current = true;

    void readStartupDesktopSceneDocument()
      .then((startupDocument) => {
        if (!startupDocument) {
          return;
        }

        loadDocument(startupDocument);
        toast.success("Scene opened");
      })
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error ? error.message : "Startup scene open failed",
        );
      });
  }, [loadDocument]);

  async function handleImport(file: File | undefined) {
    if (!file) {
      return;
    }

    try {
      loadDocument(await readSceneFile(file));
      toast.success("Scene imported");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Scene import failed",
      );
    } finally {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function handleOpenScene() {
    if (!isDesktopRuntime()) {
      inputRef.current?.click();
      return;
    }

    try {
      const importedDocument = await openDesktopSceneDocument();

      if (!importedDocument) {
        return;
      }

      loadDocument(importedDocument);
      toast.success("Scene opened");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Scene open failed");
    }
  }

  async function handleJsonExport() {
    if (!isDesktopRuntime()) {
      downloadScene(document);
      return;
    }

    try {
      const saved = await saveDesktopSceneDocument(document);

      if (saved) {
        toast.success("Scene saved");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Scene save failed");
    }
  }

  async function handleImageExport() {
    try {
      if (isDesktopRuntime()) {
        const saved = await exportDesktopViewportImage(document.name);

        if (saved) {
          toast.success("PNG exported");
        }

        return;
      }

      await exportViewportImage(document.name);
      toast.success("PNG exported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "PNG export failed");
    }
  }

  async function handleVideoExport() {
    try {
      toast.info("Recording 5 seconds");
      await exportViewportVideo(document.name);
      toast.success("WEBM exported");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Video export failed",
      );
    }
  }

  function showExportReadinessNotice(format: ExportReadinessFormat) {
    const notice = getExportReadinessNotice(document, format);

    if (notice) {
      toast.info(notice);
    }
  }

  async function handleGlbExport() {
    try {
      showExportReadinessNotice("glb");
      toast.info("Preparing GLB");
      await exportSceneGlb(document);
      toast.success("GLB exported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "GLB export failed");
    }
  }

  async function handleStlExport() {
    try {
      showExportReadinessNotice("stl");
      toast.info("Preparing STL");
      await exportSceneStl(document);
      toast.success("STL exported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "STL export failed");
    }
  }

  async function handleUsdzExport() {
    try {
      showExportReadinessNotice("usdz");
      toast.info("Preparing USDZ");
      await exportSceneUsdz(document);
      toast.success("USDZ exported");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "USDZ export failed",
      );
    }
  }

  function handleManifestExport() {
    try {
      exportSceneManifest(document);
      toast.success("Export manifest downloaded");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Manifest export failed",
      );
    }
  }

  async function handleImageSequenceExport() {
    try {
      toast.info("Exporting PNG sequence");
      const frameCount = await exportViewportImageSequence(document.name);
      toast.success(`${frameCount} PNG frames exported`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Image sequence export failed",
      );
    }
  }

  async function handleLocalSave() {
    if (!isDesktopRuntime()) {
      toast.success("Scene autosaves in this browser");
      return;
    }

    await handleJsonExport();
  }

  async function handleDesktopUpdate() {
    try {
      const installed = await installDesktopUpdate();

      if (!installed) {
        toast.success("Essence Spline is up to date");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Update check failed",
      );
    }
  }

  return (
    <header className="grid min-w-0 grid-cols-[minmax(160px,1fr)_auto] items-center gap-2 border-b border-border bg-background px-3 max-sm:grid-cols-[1fr_auto]">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Box className="size-4" />
        </div>
        <Input
          aria-label="Scene name"
          className="h-8 min-w-0 max-w-72 border-transparent bg-transparent px-2 text-sm font-medium shadow-none focus-visible:border-input"
          value={document.name}
          onChange={(event) => setDocumentName(event.target.value)}
        />
        <Badge
          className="hidden rounded-md text-[11px] font-normal sm:inline-flex"
          variant="secondary"
        >
          {document.objects.length} objects
        </Badge>
      </div>

      <div className="flex min-w-0 items-center justify-end gap-1">
        <Input
          ref={inputRef}
          className="hidden"
          type="file"
          accept="application/json,.json,.essencescene"
          onChange={(event) => void handleImport(event.target.files?.[0])}
        />
        <MenuButton icon={Type} label="Create">
          {createMenuGroups.map((group, groupIndex) => (
            <div key={group.label}>
              {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
              <MenuSection label={group.label}>
                {group.kinds.map((kind) => (
                  <DropdownMenuItem key={kind} onClick={() => addObject(kind)}>
                    {primitiveLabels[kind]}
                  </DropdownMenuItem>
                ))}
              </MenuSection>
            </div>
          ))}
          <DropdownMenuSeparator />
          <MenuSection label="Imported assets">
            {mediaObjectKinds.map((kind) => (
              <DropdownMenuItem key={kind} onClick={() => addObject(kind)}>
                {primitiveLabels[kind]}
              </DropdownMenuItem>
            ))}
          </MenuSection>
        </MenuButton>
        <MenuButton icon={Undo2} label="Edit">
          <MenuAction icon={Undo2} label="Undo" onSelect={undo} />
          <MenuAction icon={Redo2} label="Redo" onSelect={redo} />
          <DropdownMenuSeparator />
          <MenuAction icon={RotateCcw} label="Reset scene" onSelect={resetDocument} />
        </MenuButton>
        <MenuButton icon={FolderOpen} label="File">
          <MenuAction icon={FolderOpen} label="Open scene" onSelect={() => void handleOpenScene()} />
          <MenuAction icon={Save} label="Save locally" onSelect={() => void handleLocalSave()} />
          {isDesktopRuntime() ? (
            <>
              <DropdownMenuSeparator />
              <MenuAction icon={RefreshCw} label="Check for updates" onSelect={() => void handleDesktopUpdate()} />
            </>
          ) : null}
        </MenuButton>
        <MenuButton icon={Download} label="Export">
          <MenuSection label="Scene">
            <MenuAction icon={Download} label="Scene JSON" onSelect={() => void handleJsonExport()} />
            <MenuAction icon={FileJson} label="Manifest" onSelect={handleManifestExport} />
          </MenuSection>
          <DropdownMenuSeparator />
          <MenuSection label="Viewport">
            <MenuAction icon={ImageIcon} label="PNG" onSelect={() => void handleImageExport()} />
            <MenuAction icon={Images} label="PNG sequence" onSelect={() => void handleImageSequenceExport()} />
            <MenuAction icon={Film} label="WEBM" onSelect={() => void handleVideoExport()} />
          </MenuSection>
          <DropdownMenuSeparator />
          <MenuSection label="3D">
            <MenuAction icon={Cuboid} label="GLB" onSelect={() => void handleGlbExport()} />
            <MenuAction icon={Printer} label="STL" onSelect={() => void handleStlExport()} />
            <MenuAction icon={Layers3} label="USDZ" onSelect={() => void handleUsdzExport()} />
          </MenuSection>
        </MenuButton>
        <MenuButton icon={Play} label="Preview">
          <MenuAction
            icon={playModeEnabled ? Square : Play}
            label={playModeEnabled ? "Exit play mode" : "Play scene"}
            onSelect={() => setPlayModeEnabled(!playModeEnabled)}
          />
          <MenuAction
            disabled={playModeEnabled}
            icon={cameraPreviewEnabled ? Eye : Camera}
            label={cameraPreviewEnabled ? "Exit camera preview" : "Preview active camera"}
            onSelect={() => setCameraPreviewEnabled(!cameraPreviewEnabled)}
          />
        </MenuButton>
        {cloudEnabled ? <ProjectCloudPanel /> : null}
        <IconButton
          label="Command palette"
          onClick={() => setCommandPaletteOpen(true)}
          variant="ghost"
        >
          <Command className="size-4" />
        </IconButton>
      </div>
    </header>
  );
}
