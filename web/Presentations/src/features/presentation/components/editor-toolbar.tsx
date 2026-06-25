"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  AlignHorizontalDistributeCenter,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignVerticalDistributeCenter,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  BringToFront,
  ChartColumn,
  ChevronDown,
  ClipboardCopy,
  ClipboardPaste,
  Copy,
  Group,
  Grid2X2,
  Heading1,
  ImagePlus,
  Layers,
  MoreHorizontal,
  Paintbrush,
  Plus,
  Redo2,
  Ruler,
  Save,
  Scissors,
  SendToBack,
  Table2,
  TextCursorInput,
  Trash2,
  Undo2,
  Ungroup,
  Video,
  Volume2,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

import { ActionButtonGallery } from "./action-button-gallery"
import { AnimationPane } from "./animation-pane"
import { AssetHealthPanel } from "./asset-health-panel"
import { AuthPanel } from "./auth-panel"
import { BrandKitGallery } from "./brand-kit-gallery"
import { CloudSyncPanel } from "./cloud-sync-panel"
import { DesktopBridgeStatus } from "./desktop-bridge-status"
import { DiagramGallery } from "./diagram-gallery"
import { FileActionsMenu } from "./file-actions-menu"
import { FileBackstageDialog } from "./file-backstage-dialog"
import { FontPairGallery } from "./font-pair-gallery"
import { GoogleSlidesImportDialog } from "./google-slides-import-dialog"
import { IconGallery } from "./icon-gallery"
import { ImageSlideImportReportDialog } from "./image-slide-import-report-dialog"
import { ImageSlideImportReviewDialog } from "./image-slide-import-review-dialog"
import { PrintHandoutPanel } from "./print-handout-panel"
import { LocalFileStatusChip } from "./local-file-status-chip"
import { LocalRecoveryReviewDialog } from "./local-recovery-review-dialog"
import { MediaRecorderDialog } from "./media-recorder-dialog"
import { PresenceIndicator } from "./presence-indicator"
import { PptxCompatibilityReviewDialog } from "./pptx-compatibility-review-dialog"
import { PresentationCommandPalette } from "./presentation-command-palette"
import { SlideshowOverlay } from "./slideshow-overlay"
import { ShapeGallery } from "./shape-gallery"
import { StickerGallery } from "./sticker-gallery"
import { SymbolGallery } from "./symbol-gallery"
import { ThemePaletteGallery } from "./theme-palette-gallery"
import { ThemeBundleGallery } from "./theme-bundle-gallery"
import { TemplateGallery } from "./template-gallery"
import { WorkspaceControls } from "./workspace-controls"
import {
  type FileHandle,
  type FilePickerType,
  pickMultipleFilesWithPicker,
  pickSingleFileWithPicker,
  saveBlobWithPicker,
  saveTextFileWithPicker,
  writeBlobToFileHandle,
} from "../browser-downloads"
import {
  deckFileInputAccept,
  deckFileName,
  deckFilePickerTypes,
  essenceDeckMimeType,
} from "../deck-file-format"
import { isElementEditable, isElementLocked } from "../element-visibility"
import { readImageFileAsDataUrl } from "../image-files"
import {
  clearImageSlideImportReport,
  imageSlideImportItemFromFile,
  imageSlideImportReportFromItems,
  moveImageSlideImportItem,
  readImageSlideDimensions,
  readImageSlideImportReport,
  rememberImageSlideImportReport,
  removeImageSlideImportItem,
  type ImageSlideImportReport,
  type ImageSlideImportItem,
} from "../image-slide-import-review"
import {
  exportedDeckSignature,
  localDeckFileSessionFromExportedDeck,
  localDeckFileStatus,
  serializeExportedDeck,
  type LocalDeckFileSession,
} from "../local-deck-file-state"
import {
  clearLocalDeckRecoverySnapshots,
  forgetLocalDeckRecoverySnapshot,
  forgetLocalDeckRecoverySnapshotsForDeck,
  readLocalDeckRecoverySnapshots,
  rememberLocalDeckRecoverySnapshot,
  rememberLocalDeckRecoveryRestoreCheckpoint,
  type LocalDeckRecoverySnapshot,
} from "../local-deck-recovery"
import { readMediaFileAsDataUrl } from "../media-files"
import {
  clearOdpImportPreflightReport,
  odpImportPreflightAlert,
  readOdpImportPreflightReport,
  rememberOdpImportPreflightReport,
  type OdpImportPreflightReport,
} from "../odp-import-preflight"
import { importOdpDeckWithReport } from "../odp-import"
import { parseOutlineSlides } from "../outline-import"
import { deckPdfFileName, exportDeckToPdfBlob } from "../pdf-export"
import { loadCloudDeck, type CloudDeckSummary } from "../cloud-api"
import { dispatchCloudDeckOpened } from "../cloud-sync-events"
import { readDesktopBridgeReadiness } from "../desktop-bridge-readiness"
import { desktopFileCommandPayloadForCommand } from "../desktop-file-command-payloads"
import {
  listenForDesktopMenuCommands,
  type DesktopMenuCommandId,
  type DesktopMenuCommandHandlers,
} from "../desktop-menu-contract"
import {
  googleSlidesPptxFileName,
} from "../google-slides-import"
import {
  hasNativeDesktopFileApi,
  nativeDesktopFileToFile,
  readNativeDesktopFiles,
  registerNativeDesktopRecentDocument,
  writeNativeDesktopFile,
} from "../desktop-native-file-api"
import {
  pptxCompatibilityWarningMessage,
} from "../pptx-compatibility"
import {
  activatePptxCompatibilityReport,
  activePptxCompatibilityReport,
  clearPptxCompatibilityReport,
  clearPptxCompatibilityReports,
  emptyPptxCompatibilityReportArchive,
  readPptxCompatibilityReportArchive,
  rememberPptxCompatibilityReport,
  type PptxCompatibilityReportArchive,
} from "../pptx-compatibility-history"
import {
  googleSlidesImportMessage,
  isGoogleSlidesShortcutFile,
  isOdpPresentationFile,
  pptxPickerTypes,
  presentationImportInputAccept,
  presentationPptxMimeType,
  presentationPickerTypes,
} from "../presentation-interoperability"
import { importPptxDeckWithReport } from "../pptx-import"
import { deckPptxFileName, exportDeckToPptxBlob } from "../pptx-export"
import {
  clearRecentLocalDeckFiles,
  clearStaleRecentLocalDeckFiles,
  forgetRecentLocalDeckFile,
  openRecentLocalDeckFile,
  readRecentLocalDeckFile,
  readRecentLocalDeckFiles,
  rememberNativeRecentLocalDeckFile,
  rememberRecentLocalDeckFile,
  setRecentLocalDeckFilePinned,
  type RecentLocalDeckFile,
} from "../recent-local-deck-files"
import {
  forgetRecentCloudDeck,
  readPinnedCloudDeckIds,
  readRecentCloudDecks,
  rememberRecentCloudDeck,
  togglePinnedCloudDeck,
} from "../recent-cloud-decks"
import { rasterizeSlideToPng, slidePngFileName } from "../slide-raster-export"
import {
  serializeSlideToSvg,
  slideSvgFileName,
} from "../slide-svg-export"
import { deckThemes } from "../themes"
import type { Deck, ExportedDeck, ThemeName } from "../types"
import { usePresentationStore } from "../use-presentation-store"
import { workspaceDensityConfig } from "../workspace-ergonomics"

const outlinePickerTypes = [
  {
    description: "Text or Markdown outline",
    accept: {
      "text/plain": [".txt"],
      "text/markdown": [".md"],
    },
  },
]

const imagePickerTypes = [
  {
    description: "Slide images",
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
      "image/gif": [".gif"],
      "image/svg+xml": [".svg"],
    },
  },
]

const pdfPickerTypes = [
  {
    description: "PDF document",
    accept: {
      "application/pdf": [".pdf"],
    },
  },
]

const svgPickerTypes = [
  {
    description: "SVG image",
    accept: {
      "image/svg+xml": [".svg"],
    },
  },
]

const pngPickerTypes = [
  {
    description: "PNG image",
    accept: {
      "image/png": [".png"],
    },
  },
]

async function saveDeckFile(name: string, value: ExportedDeck) {
  return saveTextFileWithPicker(
    deckFileName(name),
    serializeExportedDeck(value),
    essenceDeckMimeType,
    deckFilePickerTypes,
  )
}

function deckFileBlob(value: ExportedDeck) {
  return new Blob([serializeExportedDeck(value)], {
    type: essenceDeckMimeType,
  })
}

function deckFile(name: string, value: ExportedDeck) {
  return new File([serializeExportedDeck(value)], deckFileName(name), {
    lastModified: Date.now(),
    type: essenceDeckMimeType,
  })
}

function isExportedDeck(value: unknown): value is ExportedDeck {
  const candidate = value as { version?: number; deck?: Deck }
  return candidate?.version === 1 && Array.isArray(candidate.deck?.slides)
}

type ToolbarMenuProps = {
  children: ReactNode
  label: string
}

type ToolbarMenuActionProps = {
  disabled?: boolean
  icon: LucideIcon
  label: string
  onSelect: () => void
  variant?: "default" | "destructive"
}

function ToolbarMenu({ children, label }: ToolbarMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "h-8 gap-1.5 px-2.5",
        )}
      >
        {label}
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-auto min-w-52" align="start">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ToolbarMenuAction({
  disabled,
  icon: Icon,
  label,
  onSelect,
  variant = "default",
}: ToolbarMenuActionProps) {
  return (
    <DropdownMenuItem
      disabled={disabled}
      variant={variant}
      onClick={() => {
        if (!disabled) {
          onSelect()
        }
      }}
    >
      <Icon className="size-4 text-muted-foreground" />
      <span>{label}</span>
    </DropdownMenuItem>
  )
}

type ToolbarLauncherDefinition = {
  element: ReactNode
  icon: LucideIcon
  id: string
  label: string
  width: number
}

const TOOLBAR_LAUNCHER_GAP = 4
const TOOLBAR_MORE_BUTTON_WIDTH = 86

function toolbarLauncherWidth(label: string) {
  return Math.max(74, Math.min(132, 42 + label.length * 7))
}

function fittedToolbarLauncherCount(
  availableWidth: number,
  launchers: ToolbarLauncherDefinition[],
) {
  if (availableWidth <= 0 || launchers.length === 0) {
    return launchers.length
  }

  let usedWidth = 0

  for (let index = 0; index < launchers.length; index += 1) {
    const remainingAfterCurrent = launchers.length - index - 1
    const nextWidth =
      launchers[index].width + (index > 0 ? TOOLBAR_LAUNCHER_GAP : 0)
    const moreWidth =
      remainingAfterCurrent > 0
        ? TOOLBAR_MORE_BUTTON_WIDTH + TOOLBAR_LAUNCHER_GAP
        : 0

    if (usedWidth + nextWidth + moreWidth > availableWidth) {
      return index
    }

    usedWidth += nextWidth
  }

  return launchers.length
}

type EditorToolbarProps = {
  embedded?: boolean
}

export function EditorToolbar({ embedded = false }: EditorToolbarProps) {
  const { data: session } = authClient.useSession()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const outlineInputRef = useRef<HTMLInputElement | null>(null)
  const pptxInputRef = useRef<HTMLInputElement | null>(null)
  const audioInputRef = useRef<HTMLInputElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const imageSlidesInputRef = useRef<HTMLInputElement | null>(null)
  const toolbarLauncherRailRef = useRef<HTMLDivElement | null>(null)
  const toolbarLauncherHostRefs = useRef<Array<HTMLSpanElement | null>>([])
  const videoInputRef = useRef<HTMLInputElement | null>(null)
  const deckFileHandleRef = useRef<FileHandle | null>(null)
  const nativeDeckFilePathRef = useRef<string | null>(null)
  const lastRecoverySignatureRef = useRef("")
  const [recentLocalDecks, setRecentLocalDecks] = useState<
    RecentLocalDeckFile[]
  >([])
  const [recentCloudDecks, setRecentCloudDecks] = useState<CloudDeckSummary[]>(
    [],
  )
  const [pinnedCloudDeckIds, setPinnedCloudDeckIds] = useState<string[]>([])
  const [backstageCloudDeckWorking, setBackstageCloudDeckWorking] =
    useState(false)
  const [backstageCloudDeckMessage, setBackstageCloudDeckMessage] =
    useState("")
  const [recoverySnapshots, setRecoverySnapshots] = useState<
    LocalDeckRecoverySnapshot[]
  >([])
  const [imageSlideImportItems, setImageSlideImportItems] = useState<
    ImageSlideImportItem[]
  >([])
  const [imageSlideImportReviewOpen, setImageSlideImportReviewOpen] =
    useState(false)
  const [googleSlidesImportOpen, setGoogleSlidesImportOpen] = useState(false)
  const [imageSlideImportReport, setImageSlideImportReport] =
    useState<ImageSlideImportReport | null>(null)
  const [odpImportReport, setOdpImportReport] =
    useState<OdpImportPreflightReport | null>(null)
  const [pptxImportArchive, setPptxImportArchive] =
    useState<PptxCompatibilityReportArchive>(() =>
      emptyPptxCompatibilityReportArchive(),
    )
  const [localDeckFileSession, setLocalDeckFileSession] =
    useState<LocalDeckFileSession | null>(null)
  const [visibleToolbarLauncherCount, setVisibleToolbarLauncherCount] =
    useState(Number.MAX_SAFE_INTEGER)
  const deck = usePresentationStore((state) => state.deck)
  const workspaceDensity = usePresentationStore(
    (state) => state.workspaceDensity,
  )
  const setDeckTitle = usePresentationStore((state) => state.setDeckTitle)
  const setTheme = usePresentationStore((state) => state.setTheme)
  const addSlide = usePresentationStore((state) => state.addSlide)
  const copySelectedSlide = usePresentationStore(
    (state) => state.copySelectedSlide,
  )
  const cutSelectedSlide = usePresentationStore(
    (state) => state.cutSelectedSlide,
  )
  const pasteCopiedSlides = usePresentationStore(
    (state) => state.pasteCopiedSlides,
  )
  const duplicateSlide = usePresentationStore((state) => state.duplicateSlide)
  const deleteSlide = usePresentationStore((state) => state.deleteSlide)
  const addElement = usePresentationStore((state) => state.addElement)
  const addAudioElement = usePresentationStore((state) => state.addAudioElement)
  const addImageElement = usePresentationStore((state) => state.addImageElement)
  const addVideoElement = usePresentationStore((state) => state.addVideoElement)
  const addImageSlides = usePresentationStore((state) => state.addImageSlides)
  const addOutlineSlides = usePresentationStore((state) => state.addOutlineSlides)
  const deleteElement = usePresentationStore((state) => state.deleteElement)
  const copySelectedElements = usePresentationStore(
    (state) => state.copySelectedElements,
  )
  const cutSelectedElements = usePresentationStore(
    (state) => state.cutSelectedElements,
  )
  const pasteCopiedElements = usePresentationStore(
    (state) => state.pasteCopiedElements,
  )
  const copySelectedElementStyle = usePresentationStore(
    (state) => state.copySelectedElementStyle,
  )
  const pasteCopiedElementStyle = usePresentationStore(
    (state) => state.pasteCopiedElementStyle,
  )
  const duplicateSelectedElements = usePresentationStore(
    (state) => state.duplicateSelectedElements,
  )
  const moveSelectedElementLayer = usePresentationStore(
    (state) => state.moveSelectedElementLayer,
  )
  const alignSelectedElements = usePresentationStore(
    (state) => state.alignSelectedElements,
  )
  const distributeSelectedElements = usePresentationStore(
    (state) => state.distributeSelectedElements,
  )
  const groupSelectedElements = usePresentationStore(
    (state) => state.groupSelectedElements,
  )
  const ungroupSelectedElements = usePresentationStore(
    (state) => state.ungroupSelectedElements,
  )
  const undo = usePresentationStore((state) => state.undo)
  const redo = usePresentationStore((state) => state.redo)
  const showGrid = usePresentationStore((state) => state.showGrid)
  const toggleGrid = usePresentationStore((state) => state.toggleGrid)
  const showRulers = usePresentationStore((state) => state.showRulers)
  const toggleRulers = usePresentationStore((state) => state.toggleRulers)
  const replaceDeck = usePresentationStore((state) => state.replaceDeck)
  const exportDeck = usePresentationStore((state) => state.exportDeck)
  const selectSlide = usePresentationStore((state) => state.selectSlide)
  const selectedElementId = usePresentationStore(
    (state) => state.selectedElementId,
  )
  const selectedSlideId = usePresentationStore((state) => state.selectedSlideId)
  const selectedElementIds = usePresentationStore(
    (state) => state.selectedElementIds,
  )
  const copiedElements = usePresentationStore((state) => state.copiedElements)
  const copiedElementStyle = usePresentationStore(
    (state) => state.copiedElementStyle,
  )
  const copiedSlides = usePresentationStore((state) => state.copiedSlides)
  const history = usePresentationStore((state) => state.history)
  const future = usePresentationStore((state) => state.future)
  const selectedSlideIndex = deck.slides.findIndex(
    (slide) => slide.id === selectedSlideId,
  )
  const selectedSlide = deck.slides[selectedSlideIndex]
  const densityConfig = workspaceDensityConfig(workspaceDensity)
  const selectedElements =
    selectedSlide?.elements.filter((element) =>
      selectedElementIds.includes(element.id),
    ) ?? []
  const unlockedSelectedCount = selectedElements.filter(
    (element) => !isElementLocked(element),
  ).length
  const editableSelectedCount = selectedElements.filter(isElementEditable).length
  const selectedElement = selectedSlide?.elements.find(
    (element) => element.id === selectedElementId,
  )
  const canMoveSelectedLayer = selectedElement
    ? selectedElements.every((element) => !isElementLocked(element))
    : false
  const canGroupSelected = editableSelectedCount >= 2
  const canUngroupSelected = selectedElements.some((element) => element.groupId)
  const currentExportedDeck = useMemo(() => exportDeck(), [deck, exportDeck])
  const currentFileStatus = useMemo(
    () =>
      localDeckFileStatus({
        current: currentExportedDeck,
        session: localDeckFileSession,
      }),
    [currentExportedDeck, localDeckFileSession],
  )
  const nativeFilePayloadForCommand = useCallback(
    (commandId: DesktopMenuCommandId) => {
      if (!hasNativeDesktopFileApi()) return null

      const payload = desktopFileCommandPayloadForCommand(
        commandId,
        readDesktopBridgeReadiness(),
        {
          canExportSelectedSlide: Boolean(selectedSlide),
        },
      )

      return payload?.channel === "native-shell" && payload.status === "ready"
        ? payload
        : null
    },
    [selectedSlide],
  )
  const pptxImportReport = useMemo(
    () => activePptxCompatibilityReport(pptxImportArchive),
    [pptxImportArchive],
  )
  const pptxImportWarnings = pptxImportReport?.warnings ?? []
  const pptxWarningSource = useMemo(() => {
    if (!pptxImportReport) return ""

    const importedAt = new Date(pptxImportReport.importedAt)

    return `${pptxImportReport.sourceFileName} - ${importedAt.toLocaleDateString()}`
  }, [pptxImportReport])

  useEffect(() => {
    setRecentLocalDecks(readRecentLocalDeckFiles())
    setRecentCloudDecks(readRecentCloudDecks())
    setPinnedCloudDeckIds(readPinnedCloudDeckIds())
    setRecoverySnapshots(readLocalDeckRecoverySnapshots())
    setImageSlideImportReport(readImageSlideImportReport())
    setOdpImportReport(readOdpImportPreflightReport())
    setPptxImportArchive(readPptxCompatibilityReportArchive())
  }, [])

  useEffect(() => {
    const signature = exportedDeckSignature(currentExportedDeck)

    if (signature === lastRecoverySignatureRef.current) return

    const timeout = window.setTimeout(() => {
      lastRecoverySignatureRef.current = signature
      setRecoverySnapshots(
        rememberLocalDeckRecoverySnapshot(currentExportedDeck),
      )
    }, 1200)

    return () => window.clearTimeout(timeout)
  }, [currentExportedDeck])

  const importDeck = useCallback(async (file: File | undefined) => {
    if (!file) return null
    const text = await file.text()
    const parsed = JSON.parse(text) as unknown
    if (isExportedDeck(parsed)) {
      replaceDeck(parsed.deck)
      return parsed
    }
    return null
  }, [replaceDeck])

  const markLocalDeckFileSession = useCallback(
    (input: { exportedDeck: ExportedDeck; fileName: string; writable: boolean }) => {
      setLocalDeckFileSession(
        localDeckFileSessionFromExportedDeck({
          exportedDeck: input.exportedDeck,
          fileName: input.fileName,
          writable: input.writable,
        }),
      )
    },
    [],
  )

  const rememberLocalDeckFile = useCallback(
    async (file: File, handle: FileHandle) => {
      setRecentLocalDecks(await rememberRecentLocalDeckFile({ file, handle }))
    },
    [],
  )

  const rememberNativeLocalDeckFile = useCallback(
    (file: File, nativePath: string) => {
      setRecentLocalDecks(
        rememberNativeRecentLocalDeckFile({ file, nativePath }),
      )
      void registerNativeDesktopRecentDocument({ path: nativePath }).catch(
        (error) => {
          console.warn("Could not register OS recent document.", error)
        },
      )
    },
    [],
  )

  const openDeckFile = useCallback(async () => {
    try {
      const nativePayload = nativeFilePayloadForCommand("file.open")

      if (nativePayload) {
        const result = await readNativeDesktopFiles(nativePayload)

        if (result.status === "cancelled") return

        const nativeFile = result.files[0]
        if (!nativeFile) return

        const file = await nativeDesktopFileToFile(nativeFile)
        const importedDeck = await importDeck(file)

        if (importedDeck) {
          deckFileHandleRef.current = null
          nativeDeckFilePathRef.current = nativeFile.path
          markLocalDeckFileSession({
            exportedDeck: importedDeck,
            fileName: file.name,
            writable: true,
          })
          rememberNativeLocalDeckFile(file, nativeFile.path)
        }
        return
      }

      const result = await pickSingleFileWithPicker(deckFilePickerTypes)

      if (result.status === "picked") {
        const importedDeck = await importDeck(result.file)

        if (importedDeck) {
          deckFileHandleRef.current = result.handle
          nativeDeckFilePathRef.current = null
          markLocalDeckFileSession({
            exportedDeck: importedDeck,
            fileName: result.file.name,
            writable: true,
          })
          await rememberLocalDeckFile(result.file, result.handle)
        }
        return
      }

      if (result.status === "unsupported") {
        fileInputRef.current?.click()
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not open this deck file."

      window.alert(message)
    }
  }, [
    importDeck,
    markLocalDeckFileSession,
    nativeFilePayloadForCommand,
    rememberLocalDeckFile,
    rememberNativeLocalDeckFile,
  ])

  const openFallbackDeckFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return

      try {
        const importedDeck = await importDeck(file)

        if (!importedDeck) return

        deckFileHandleRef.current = null
        nativeDeckFilePathRef.current = null
        markLocalDeckFileSession({
          exportedDeck: importedDeck,
          fileName: file.name,
          writable: false,
        })
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not open this deck file."

        window.alert(message)
      }
    },
    [importDeck, markLocalDeckFileSession],
  )

  const openRecentDeckFile = useCallback(
    async (recentId: string) => {
      try {
        const recent = readRecentLocalDeckFile(recentId)
        const nativePayload = nativeFilePayloadForCommand("file.open")

        if (recent?.nativePath && nativePayload) {
          const result = await readNativeDesktopFiles(nativePayload, {
            path: recent.nativePath,
          })

          if (result.status === "cancelled") return

          const nativeFile = result.files[0]
          if (!nativeFile) {
            setRecentLocalDecks(await forgetRecentLocalDeckFile(recentId))
            window.alert("This recent deck is no longer available. Choose it again.")
            return
          }

          const file = await nativeDesktopFileToFile(nativeFile)
          const importedDeck = await importDeck(file)

          if (importedDeck) {
            deckFileHandleRef.current = null
            nativeDeckFilePathRef.current = nativeFile.path
            markLocalDeckFileSession({
              exportedDeck: importedDeck,
              fileName: file.name,
              writable: true,
            })
            rememberNativeLocalDeckFile(file, nativeFile.path)
          }
          return
        }

        const result = await openRecentLocalDeckFile(recentId)

        if (!result) {
          setRecentLocalDecks(await forgetRecentLocalDeckFile(recentId))
          window.alert("This recent deck is no longer available. Choose it again.")
          return
        }

        const importedDeck = await importDeck(result.file)

        if (importedDeck) {
          deckFileHandleRef.current = result.handle
          nativeDeckFilePathRef.current = null
          markLocalDeckFileSession({
            exportedDeck: importedDeck,
            fileName: result.file.name,
            writable: true,
          })
          await rememberLocalDeckFile(result.file, result.handle)
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not open this recent deck file."

        window.alert(message)
      }
    },
    [
      importDeck,
      markLocalDeckFileSession,
      nativeFilePayloadForCommand,
      rememberLocalDeckFile,
      rememberNativeLocalDeckFile,
    ],
  )

  const clearRecentDeckFiles = useCallback(async () => {
    setRecentLocalDecks(await clearRecentLocalDeckFiles())
  }, [])

  const clearStaleRecentDeckFileEntries = useCallback(async () => {
    setRecentLocalDecks(await clearStaleRecentLocalDeckFiles())
  }, [])

  const forgetRecentDeckFile = useCallback(async (recentId: string) => {
    setRecentLocalDecks(await forgetRecentLocalDeckFile(recentId))
  }, [])

  const toggleRecentDeckPin = useCallback(
    async (recentId: string, pinned: boolean) => {
      setRecentLocalDecks(
        await setRecentLocalDeckFilePinned(recentId, pinned),
      )
    },
    [],
  )

  const refreshBackstageCloudDeckShortcuts = useCallback(() => {
    setRecentCloudDecks(readRecentCloudDecks())
    setPinnedCloudDeckIds(readPinnedCloudDeckIds())
  }, [])

  const forgetRecentCloudDeckShortcut = useCallback((deckId: string) => {
    setRecentCloudDecks((items) => forgetRecentCloudDeck(deckId, items))
  }, [])

  const toggleBackstageCloudDeckPin = useCallback((deckId: string) => {
    setPinnedCloudDeckIds((items) => togglePinnedCloudDeck(deckId, items))
  }, [])

  const openRecentCloudDeckShortcut = useCallback(
    async (deckId: string) => {
      if (!session?.user) {
        setBackstageCloudDeckMessage("Sign in before opening cloud decks.")
        return
      }

      setBackstageCloudDeckWorking(true)
      setBackstageCloudDeckMessage("")

      try {
        const summary =
          recentCloudDecks.find((item) => item.id === deckId) ?? null
        const cloudDeck = await loadCloudDeck(deckId)
        const access = {
          accessRole: summary?.accessRole ?? "owner",
          ownerName: summary?.ownerName ?? null,
        } satisfies Pick<CloudDeckSummary, "accessRole" | "ownerName">

        deckFileHandleRef.current = null
        nativeDeckFilePathRef.current = null
        setLocalDeckFileSession(null)
        replaceDeck(cloudDeck)
        setRecentCloudDecks((items) =>
          rememberRecentCloudDeck(cloudDeck, items, access),
        )
        dispatchCloudDeckOpened({ access, deck: cloudDeck })
        setBackstageCloudDeckMessage("Opened cloud deck.")
      } catch (error) {
        setBackstageCloudDeckMessage(
          error instanceof Error ? error.message : "Could not open cloud deck.",
        )
      } finally {
        setBackstageCloudDeckWorking(false)
      }
    },
    [recentCloudDecks, replaceDeck, session?.user],
  )

  const openRecoverySnapshot = useCallback(
    (snapshotId: string) => {
      const result = rememberLocalDeckRecoveryRestoreCheckpoint(
        snapshotId,
        currentExportedDeck,
      )

      if (!result.snapshot) {
        setRecoverySnapshots(result.snapshots)
        return "Recovery snapshot was no longer available."
      }

      replaceDeck(result.snapshot.exportedDeck.deck)
      deckFileHandleRef.current = null
      nativeDeckFilePathRef.current = null
      setLocalDeckFileSession(null)
      setRecoverySnapshots(result.snapshots)

      return result.checkpointCreated
        ? "Restored snapshot. Current deck was saved as a rollback snapshot."
        : "Restored snapshot."
    },
    [currentExportedDeck, replaceDeck],
  )

  const clearRecoverySnapshots = useCallback(() => {
    setRecoverySnapshots(clearLocalDeckRecoverySnapshots())
  }, [])

  const deleteRecoverySnapshot = useCallback((snapshotId: string) => {
    setRecoverySnapshots(forgetLocalDeckRecoverySnapshot(snapshotId))
  }, [])

  const clearCurrentRecoverySnapshots = useCallback(() => {
    setRecoverySnapshots(forgetLocalDeckRecoverySnapshotsForDeck(deck.id))
  }, [deck.id])

  const clearActivePptxReport = useCallback(() => {
    setPptxImportArchive(clearPptxCompatibilityReport())
  }, [])

  const clearPptxReportHistory = useCallback(() => {
    setPptxImportArchive(clearPptxCompatibilityReports())
  }, [])

  const openPptxReport = useCallback((reportId: string) => {
    setPptxImportArchive(activatePptxCompatibilityReport(reportId))
  }, [])

  const clearOdpReport = useCallback(() => {
    setOdpImportReport(clearOdpImportPreflightReport())
  }, [])

  async function importOdp(file: File) {
    const result = await importOdpDeckWithReport(file)
    const report = rememberOdpImportPreflightReport(result.report)

    replaceDeck(result.deck)
    deckFileHandleRef.current = null
    nativeDeckFilePathRef.current = null
    setLocalDeckFileSession(null)
    setOdpImportReport(report)
    window.alert(odpImportPreflightAlert(report))
  }

  async function importPptx(file: File | undefined) {
    if (!file) return

    try {
      if (isGoogleSlidesShortcutFile(file)) {
        window.alert(googleSlidesImportMessage(file.name))
        return
      }

      if (isOdpPresentationFile(file)) {
        await importOdp(file)
        return
      }

      const result = await importPptxDeckWithReport(file)

      replaceDeck(result.deck)
      deckFileHandleRef.current = null
      nativeDeckFilePathRef.current = null
      setLocalDeckFileSession(null)
      setPptxImportArchive(
        rememberPptxCompatibilityReport({
          deck: result.deck,
          sourceFileName: file.name,
          warnings: result.warnings,
        }),
      )
      const compatibilityMessage = pptxCompatibilityWarningMessage(
        result.warnings,
      )

      if (compatibilityMessage) {
        window.alert(compatibilityMessage)
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not import this presentation file."

      window.alert(message)
    }
  }

  async function importGoogleSlidesLink(sourceUrl: string) {
    try {
      const response = await fetch(
        `/api/presentation/google-slides-export?url=${encodeURIComponent(
          sourceUrl,
        )}`,
      )

      if (!response.ok) {
        let message =
          "Could not fetch a PPTX export from Google Slides. Download it as Microsoft PowerPoint (.pptx), then import that file."

        try {
          const body = (await response.json()) as { error?: string }
          message = body.error || message
        } catch {
          // Keep the user-facing fallback message when the response is not JSON.
        }

        window.alert(message)
        return false
      }

      const fileName =
        response.headers.get("x-presentation-filename") ??
        googleSlidesPptxFileName(sourceUrl)
      const blob = await response.blob()

      await importPptx(
        new File([blob], fileName, {
          type: presentationPptxMimeType,
        }),
      )
      return true
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not fetch a PPTX export from Google Slides."

      window.alert(message)
      return false
    }
  }

  async function importImage(file: File | undefined) {
    if (!file) return
    const src = await readImageFileAsDataUrl(file)
    addImageElement({ src, alt: file.name })
  }

  async function importAudio(file: File | undefined) {
    if (!file) return
    const src = await readMediaFileAsDataUrl(file)
    addAudioElement({ src, alt: file.name })
  }

  async function importVideo(file: File | undefined) {
    if (!file) return
    const src = await readMediaFileAsDataUrl(file)
    addVideoElement({ src, alt: file.name })
  }

  async function importOutline(file: File | undefined) {
    if (!file) return
    const text = await file.text()
    addOutlineSlides(parseOutlineSlides(text))
  }

  async function importImagesAsSlides(files: FileList | File[] | null) {
    const images = files ? Array.from(files) : []
    if (!images.length) return

    const items = await Promise.all(
      images.map(async (file) => {
        const src = await readImageFileAsDataUrl(file)

        return imageSlideImportItemFromFile(
          file,
          src,
          await readImageSlideDimensions(src),
        )
      }),
    )

    setImageSlideImportItems(items)
    setImageSlideImportReviewOpen(true)
  }

  const closeImageSlideImportReview = useCallback((open: boolean) => {
    setImageSlideImportReviewOpen(open)

    if (!open) {
      setImageSlideImportItems([])
    }
  }, [])

  const confirmImageSlideImport = useCallback(() => {
    if (!imageSlideImportItems.length) return

    const startingSlideNumber = deck.slides.length + 1

    addImageSlides(
      imageSlideImportItems.map((item) => ({
        alt: item.alt,
        src: item.src,
      })),
    )
    setImageSlideImportReport(
      rememberImageSlideImportReport(
        imageSlideImportReportFromItems(imageSlideImportItems, {
          startingSlideNumber,
        }),
      ),
    )
    closeImageSlideImportReview(false)
  }, [
    addImageSlides,
    closeImageSlideImportReview,
    deck.slides.length,
    imageSlideImportItems,
  ])

  const clearRecentImageSlideImportReport = useCallback(() => {
    setImageSlideImportReport(clearImageSlideImportReport())
  }, [])

  const selectImageImportReportSlide = useCallback(
    (slideNumber: number) => {
      const slide = deck.slides[slideNumber - 1]

      if (!slide) {
        return "That imported slide is no longer at this position."
      }

      selectSlide(slide.id)
      return `Selected slide ${slideNumber}.`
    },
    [deck.slides, selectSlide],
  )

  const movePendingImageSlide = useCallback(
    (itemId: string, direction: -1 | 1) => {
      setImageSlideImportItems((items) =>
        moveImageSlideImportItem(items, itemId, direction),
      )
    },
    [],
  )

  const removePendingImageSlide = useCallback((itemId: string) => {
    setImageSlideImportItems((items) =>
      removeImageSlideImportItem(items, itemId),
    )
  }, [])

  async function openPptxFile() {
    try {
      const nativePayload = nativeFilePayloadForCommand(
        "file.importPresentation",
      )

      if (nativePayload) {
        const result = await readNativeDesktopFiles(nativePayload)

        if (result.status === "cancelled") return

        const nativeFile = result.files[0]
        if (!nativeFile) return

        await importPptx(await nativeDesktopFileToFile(nativeFile))
        return
      }

      const result = await pickSingleFileWithPicker(presentationPickerTypes)

      if (result.status === "picked") {
        await importPptx(result.file)
        return
      }

      if (result.status === "unsupported") {
        pptxInputRef.current?.click()
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not open this presentation file."

      window.alert(message)
    }
  }

  async function openOutlineFile() {
    try {
      const nativePayload = nativeFilePayloadForCommand("file.importOutline")

      if (nativePayload) {
        const result = await readNativeDesktopFiles(nativePayload)

        if (result.status === "cancelled") return

        const nativeFile = result.files[0]
        if (!nativeFile) return

        await importOutline(await nativeDesktopFileToFile(nativeFile))
        return
      }

      const result = await pickSingleFileWithPicker(outlinePickerTypes)

      if (result.status === "picked") {
        await importOutline(result.file)
        return
      }

      if (result.status === "unsupported") {
        outlineInputRef.current?.click()
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not open this outline."

      window.alert(message)
    }
  }

  async function openImageSlidesFiles() {
    try {
      const nativePayload = nativeFilePayloadForCommand("file.importImageSlides")

      if (nativePayload) {
        const result = await readNativeDesktopFiles(nativePayload)

        if (result.status === "cancelled") return

        await importImagesAsSlides(
          await Promise.all(result.files.map(nativeDesktopFileToFile)),
        )
        return
      }

      const result = await pickMultipleFilesWithPicker(imagePickerTypes)

      if (result.status === "picked") {
        await importImagesAsSlides(result.files)
        return
      }

      if (result.status === "unsupported") {
        imageSlidesInputRef.current?.click()
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not open these image slides."

      window.alert(message)
    }
  }

  async function saveTextForCommand(
    commandId: DesktopMenuCommandId,
    name: string,
    value: string,
    type: string,
    pickerTypes: FilePickerType[],
  ) {
    const nativePayload = nativeFilePayloadForCommand(commandId)

    if (nativePayload) {
      return writeNativeDesktopFile(nativePayload, {
        suggestedName: name,
        text: value,
      })
    }

    return saveTextFileWithPicker(name, value, type, pickerTypes)
  }

  async function saveBlobForCommand(
    commandId: DesktopMenuCommandId,
    name: string,
    blob: Blob,
    pickerTypes: FilePickerType[],
  ) {
    const nativePayload = nativeFilePayloadForCommand(commandId)

    if (nativePayload) {
      return writeNativeDesktopFile(nativePayload, {
        blob,
        suggestedName: name,
      })
    }

    return saveBlobWithPicker(name, blob, pickerTypes)
  }

  async function exportSelectedSlideSvg() {
    if (!selectedSlide) return

    await saveTextForCommand(
      "file.exportSlideSvg",
      slideSvgFileName(selectedSlide, selectedSlideIndex),
      serializeSlideToSvg(selectedSlide, deck.assets, {
        master: deck.master,
        slideNumber: selectedSlideIndex + 1,
        slideCount: deck.slides.length,
      }),
      "image/svg+xml",
      svgPickerTypes,
    )
  }

  async function exportSelectedSlidePng() {
    if (!selectedSlide) return

    try {
      await saveBlobForCommand(
        "file.exportSlidePng",
        slidePngFileName(selectedSlide, selectedSlideIndex),
        await rasterizeSlideToPng(selectedSlide, deck.assets, {
          master: deck.master,
          slideNumber: selectedSlideIndex + 1,
          slideCount: deck.slides.length,
        }),
        pngPickerTypes,
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not export the selected slide as a PNG."

      window.alert(message)
    }
  }

  async function exportNativePptx() {
    try {
      await saveBlobForCommand(
        "file.exportPptx",
        deckPptxFileName(deck),
        await exportDeckToPptxBlob(deck),
        pptxPickerTypes,
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not export this deck as a PowerPoint file."

      window.alert(message)
    }
  }

  async function exportPdf() {
    try {
      await saveBlobForCommand(
        "file.exportPdf",
        deckPdfFileName(deck),
        await exportDeckToPdfBlob(deck),
        pdfPickerTypes,
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not export this deck as a PDF."

      window.alert(message)
    }
  }

  const saveDeckAsJson = useCallback(async () => {
    const exportedDeck = currentExportedDeck
    const nativePayload = nativeFilePayloadForCommand("file.saveAsJson")

    if (nativePayload) {
      const file = deckFile(deck.title, exportedDeck)
      const result = await writeNativeDesktopFile(nativePayload, {
        suggestedName: file.name,
        text: serializeExportedDeck(exportedDeck),
      })

      if (result.status === "saved") {
        deckFileHandleRef.current = null
        nativeDeckFilePathRef.current = result.path
        markLocalDeckFileSession({
          exportedDeck,
          fileName: result.fileName,
          writable: true,
        })
        rememberNativeLocalDeckFile(file, result.path)
      }
      return
    }

    const result = await saveDeckFile(deck.title, exportedDeck)

    if (result.status === "saved") {
      deckFileHandleRef.current = result.handle
      nativeDeckFilePathRef.current = null
      const file = await result.handle.getFile()

      markLocalDeckFileSession({
        exportedDeck,
        fileName: file.name,
        writable: true,
      })
      await rememberLocalDeckFile(file, result.handle)
    }
  }, [
    currentExportedDeck,
    deck.title,
    markLocalDeckFileSession,
    nativeFilePayloadForCommand,
    rememberLocalDeckFile,
    rememberNativeLocalDeckFile,
  ])

  const saveDeckToCurrentFile = useCallback(async () => {
    const currentHandle = deckFileHandleRef.current
    const nativePath = nativeDeckFilePathRef.current
    const exportedDeck = currentExportedDeck
    const nativePayload = nativeFilePayloadForCommand("file.save")

    if (nativePath && nativePayload) {
      const file = deckFile(deck.title, exportedDeck)
      const result = await writeNativeDesktopFile(nativePayload, {
        path: nativePath,
        suggestedName: file.name,
        text: serializeExportedDeck(exportedDeck),
      })

      if (result.status === "saved") {
        nativeDeckFilePathRef.current = result.path
        markLocalDeckFileSession({
          exportedDeck,
          fileName: result.fileName,
          writable: true,
        })
        rememberNativeLocalDeckFile(file, result.path)
      }
      return
    }

    if (currentHandle) {
      try {
        await writeBlobToFileHandle(currentHandle, deckFileBlob(exportedDeck))
        const file = await currentHandle.getFile()

        nativeDeckFilePathRef.current = null
        markLocalDeckFileSession({
          exportedDeck,
          fileName: file.name,
          writable: true,
        })
        await rememberLocalDeckFile(file, currentHandle)
        return
      } catch {
        deckFileHandleRef.current = null
      }
    }

    if (nativePayload) {
      const file = deckFile(deck.title, exportedDeck)
      const result = await writeNativeDesktopFile(nativePayload, {
        suggestedName: file.name,
        text: serializeExportedDeck(exportedDeck),
      })

      if (result.status === "saved") {
        nativeDeckFilePathRef.current = result.path
        markLocalDeckFileSession({
          exportedDeck,
          fileName: result.fileName,
          writable: true,
        })
        rememberNativeLocalDeckFile(file, result.path)
      }
      return
    }

    const result = await saveDeckFile(deck.title, exportedDeck)

    if (result.status === "saved") {
      deckFileHandleRef.current = result.handle
      nativeDeckFilePathRef.current = null
      const file = await result.handle.getFile()

      markLocalDeckFileSession({
        exportedDeck,
        fileName: file.name,
        writable: true,
      })
      await rememberLocalDeckFile(file, result.handle)
    }
  }, [
    currentExportedDeck,
    deck.title,
    markLocalDeckFileSession,
    nativeFilePayloadForCommand,
    rememberLocalDeckFile,
    rememberNativeLocalDeckFile,
  ])

  const desktopMenuCommandHandlers = useMemo<DesktopMenuCommandHandlers>(
    () => ({
      "file.exportPdf": () => void exportPdf(),
      "file.exportPptx": () => void exportNativePptx(),
      "file.exportSlidePng": () => void exportSelectedSlidePng(),
      "file.exportSlideSvg": () => void exportSelectedSlideSvg(),
      "file.importImageSlides": () => void openImageSlidesFiles(),
      "file.importOutline": () => void openOutlineFile(),
      "file.importPresentation": () => void openPptxFile(),
      "file.open": () => void openDeckFile(),
      "file.save": () => void saveDeckToCurrentFile(),
      "file.saveAsJson": () => void saveDeckAsJson(),
    }),
    [
      exportNativePptx,
      exportPdf,
      exportSelectedSlidePng,
      exportSelectedSlideSvg,
      openDeckFile,
      openImageSlidesFiles,
      openOutlineFile,
      openPptxFile,
      saveDeckAsJson,
      saveDeckToCurrentFile,
    ],
  )

  useEffect(() => {
    function handleFileShortcut(event: KeyboardEvent) {
      const commandKey = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()

      if (!commandKey || event.altKey) {
        return
      }

      if (key === "o") {
        event.preventDefault()
        void openDeckFile()
        return
      }

      if (key === "s") {
        event.preventDefault()
        void saveDeckToCurrentFile()
      }
    }

    window.addEventListener("keydown", handleFileShortcut)
    return () => window.removeEventListener("keydown", handleFileShortcut)
  }, [openDeckFile, saveDeckToCurrentFile])

  useEffect(
    () => listenForDesktopMenuCommands(desktopMenuCommandHandlers),
    [desktopMenuCommandHandlers],
  )

  const toolbarLaunchers = useMemo<ToolbarLauncherDefinition[]>(
    () => [
      {
        element: <ShapeGallery />,
        icon: Grid2X2,
        id: "shapes",
        label: "Shapes",
        width: toolbarLauncherWidth("Shapes"),
      },
      {
        element: <IconGallery />,
        icon: ImagePlus,
        id: "icons",
        label: "Icons",
        width: toolbarLauncherWidth("Icons"),
      },
      {
        element: <StickerGallery />,
        icon: Layers,
        id: "stickers",
        label: "Stickers",
        width: toolbarLauncherWidth("Stickers"),
      },
      {
        element: <SymbolGallery />,
        icon: TextCursorInput,
        id: "symbols",
        label: "Symbols",
        width: toolbarLauncherWidth("Symbols"),
      },
      {
        element: <ActionButtonGallery />,
        icon: BringToFront,
        id: "actions",
        label: "Actions",
        width: toolbarLauncherWidth("Actions"),
      },
      {
        element: <DiagramGallery />,
        icon: ChartColumn,
        id: "diagrams",
        label: "Diagrams",
        width: toolbarLauncherWidth("Diagrams"),
      },
      {
        element: <MediaRecorderDialog />,
        icon: Video,
        id: "record",
        label: "Record",
        width: toolbarLauncherWidth("Record"),
      },
      {
        element: <ThemePaletteGallery />,
        icon: Paintbrush,
        id: "palettes",
        label: "Palettes",
        width: toolbarLauncherWidth("Palettes"),
      },
      {
        element: <FontPairGallery />,
        icon: Heading1,
        id: "fonts",
        label: "Fonts",
        width: toolbarLauncherWidth("Fonts"),
      },
      {
        element: <BrandKitGallery />,
        icon: Paintbrush,
        id: "brand-kits",
        label: "Brand kits",
        width: toolbarLauncherWidth("Brand kits"),
      },
      {
        element: <ThemeBundleGallery />,
        icon: Layers,
        id: "theme-bundles",
        label: "Themes",
        width: toolbarLauncherWidth("Themes"),
      },
      {
        element: <TemplateGallery />,
        icon: Grid2X2,
        id: "templates",
        label: "Templates",
        width: toolbarLauncherWidth("Templates"),
      },
      {
        element: <AssetHealthPanel />,
        icon: ImagePlus,
        id: "assets",
        label: "Assets",
        width: toolbarLauncherWidth("Assets"),
      },
      {
        element: <PrintHandoutPanel deck={deck} />,
        icon: Save,
        id: "handout",
        label: "Handout",
        width: toolbarLauncherWidth("Handout"),
      },
      {
        element: <AnimationPane />,
        icon: Video,
        id: "animations",
        label: "Animations",
        width: toolbarLauncherWidth("Animations"),
      },
      {
        element: <SlideshowOverlay />,
        icon: Video,
        id: "present",
        label: "Present",
        width: toolbarLauncherWidth("Present"),
      },
    ],
    [deck],
  )

  const openToolbarLauncher = useCallback((index: number) => {
    const launcherHost = toolbarLauncherHostRefs.current[index]
    const launcherButton = launcherHost?.querySelector<HTMLElement>(
      "button,[role='button']",
    )

    launcherButton?.click()
  }, [])

  useEffect(() => {
    const rail = toolbarLauncherRailRef.current

    if (!rail) {
      return
    }

    const updateVisibleLaunchers = () => {
      const nextVisibleLauncherCount = fittedToolbarLauncherCount(
        rail.clientWidth,
        toolbarLaunchers,
      )

      setVisibleToolbarLauncherCount((currentVisibleLauncherCount) =>
        currentVisibleLauncherCount === nextVisibleLauncherCount
          ? currentVisibleLauncherCount
          : nextVisibleLauncherCount,
      )
    }

    updateVisibleLaunchers()

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateVisibleLaunchers)
      return () => window.removeEventListener("resize", updateVisibleLaunchers)
    }

    const observer = new ResizeObserver(updateVisibleLaunchers)
    observer.observe(rail)
    window.addEventListener("resize", updateVisibleLaunchers)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", updateVisibleLaunchers)
    }
  }, [toolbarLaunchers])

  const visibleToolbarLaunchers = toolbarLaunchers.slice(
    0,
    Math.min(visibleToolbarLauncherCount, toolbarLaunchers.length),
  )
  const overflowToolbarLaunchers = toolbarLaunchers.slice(
    visibleToolbarLaunchers.length,
  )

  return (
    <header
      role="toolbar"
      aria-label="Presentation toolbar"
      className="grid shrink-0 overflow-hidden border-b bg-background"
    >
      <div
        className={cn(
          "flex min-h-11 min-w-0 items-center border-b border-border/60 py-1",
          densityConfig.toolbarClassName,
        )}
      >
        <Save className="size-4 text-muted-foreground" />
        <Input
          aria-label="Deck title"
          className={cn(
            "h-7 min-w-0 border-transparent bg-transparent px-1 text-sm font-semibold shadow-none focus-visible:bg-background",
            densityConfig.titleInputClassName,
          )}
          value={deck.title}
          onChange={(event) => setDeckTitle(event.currentTarget.value)}
        />
        <Badge variant="outline" className="hidden sm:inline-flex">
          {deck.slides.length} slides
        </Badge>
        <LocalFileStatusChip status={currentFileStatus} />
        {embedded ? null : (
          <DesktopBridgeStatus
            canExportSelectedSlide={Boolean(selectedSlide)}
            recentDecks={recentLocalDecks}
          />
        )}
        <PresentationCommandPalette />
        {embedded ? null : <WorkspaceControls />}

        <div className="ml-auto flex min-w-max items-center justify-end gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ToolbarMenu label="Edit">
            <ToolbarMenuAction
              label="Undo"
              icon={Undo2}
              disabled={!history.length}
              onSelect={undo}
            />
            <ToolbarMenuAction
              label="Redo"
              icon={Redo2}
              disabled={!future.length}
              onSelect={redo}
            />
            <DropdownMenuSeparator />
            <ToolbarMenuAction
              label="Copy object"
              icon={ClipboardCopy}
              disabled={!editableSelectedCount}
              onSelect={copySelectedElements}
            />
            <ToolbarMenuAction
              label="Cut object"
              icon={Scissors}
              disabled={!editableSelectedCount}
              onSelect={cutSelectedElements}
            />
            <ToolbarMenuAction
              label="Paste object"
              icon={ClipboardPaste}
              disabled={!copiedElements.length}
              onSelect={pasteCopiedElements}
            />
            <ToolbarMenuAction
              label="Duplicate object"
              icon={Copy}
              disabled={!editableSelectedCount}
              onSelect={duplicateSelectedElements}
            />
            <ToolbarMenuAction
              label="Delete object"
              icon={Trash2}
              disabled={!unlockedSelectedCount}
              variant="destructive"
              onSelect={deleteElement}
            />
            <DropdownMenuSeparator />
            <ToolbarMenuAction
              label="Copy object style"
              icon={Paintbrush}
              disabled={!editableSelectedCount}
              onSelect={copySelectedElementStyle}
            />
            <ToolbarMenuAction
              label="Apply copied style"
              icon={Paintbrush}
              disabled={!editableSelectedCount || !copiedElementStyle}
              onSelect={pasteCopiedElementStyle}
            />
          </ToolbarMenu>

          <ToolbarMenu label="Slides">
            <ToolbarMenuAction label="Add slide" icon={Plus} onSelect={addSlide} />
            <ToolbarMenuAction
              label="Copy selected slide"
              icon={ClipboardCopy}
              onSelect={copySelectedSlide}
            />
            <ToolbarMenuAction
              label="Cut selected slide"
              icon={Scissors}
              disabled={deck.slides.length <= 1}
              onSelect={cutSelectedSlide}
            />
            <ToolbarMenuAction
              label="Paste copied slide"
              icon={ClipboardPaste}
              disabled={!copiedSlides.length}
              onSelect={pasteCopiedSlides}
            />
            <ToolbarMenuAction
              label="Duplicate slide"
              icon={Layers}
              onSelect={duplicateSlide}
            />
            <ToolbarMenuAction
              label="Delete slide"
              icon={Trash2}
              disabled={deck.slides.length <= 1}
              variant="destructive"
              onSelect={deleteSlide}
            />
          </ToolbarMenu>

          <ToolbarMenu label="Insert">
            <DropdownMenuLabel>Basic content</DropdownMenuLabel>
            <ToolbarMenuAction
              label="Title"
              icon={Heading1}
              onSelect={() => addElement("title")}
            />
            <ToolbarMenuAction
              label="Text"
              icon={TextCursorInput}
              onSelect={() => addElement("text")}
            />
            <ToolbarMenuAction
              label="Table"
              icon={Table2}
              onSelect={() => addElement("table")}
            />
            <ToolbarMenuAction
              label="Chart"
              icon={ChartColumn}
              onSelect={() => addElement("chart")}
            />
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Media</DropdownMenuLabel>
            <ToolbarMenuAction
              label="Image"
              icon={ImagePlus}
              onSelect={() => imageInputRef.current?.click()}
            />
            <ToolbarMenuAction
              label="Video"
              icon={Video}
              onSelect={() => videoInputRef.current?.click()}
            />
            <ToolbarMenuAction
              label="Audio"
              icon={Volume2}
              onSelect={() => audioInputRef.current?.click()}
            />
          </ToolbarMenu>

          <ToolbarMenu label="Arrange">
            <DropdownMenuLabel>Layer order</DropdownMenuLabel>
            <ToolbarMenuAction
              label="Bring to front"
              icon={BringToFront}
              disabled={!canMoveSelectedLayer}
              onSelect={() => moveSelectedElementLayer(1, "boundary")}
            />
            <ToolbarMenuAction
              label="Send to back"
              icon={SendToBack}
              disabled={!canMoveSelectedLayer}
              onSelect={() => moveSelectedElementLayer(-1, "boundary")}
            />
            <ToolbarMenuAction
              label="Group objects"
              icon={Group}
              disabled={!canGroupSelected}
              onSelect={groupSelectedElements}
            />
            <ToolbarMenuAction
              label="Ungroup objects"
              icon={Ungroup}
              disabled={!canUngroupSelected}
              onSelect={ungroupSelectedElements}
            />
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Align</DropdownMenuLabel>
            <ToolbarMenuAction
              label="Align left"
              icon={AlignHorizontalJustifyStart}
              disabled={!editableSelectedCount}
              onSelect={() => alignSelectedElements("left")}
            />
            <ToolbarMenuAction
              label="Align center"
              icon={AlignHorizontalJustifyCenter}
              disabled={!editableSelectedCount}
              onSelect={() => alignSelectedElements("center")}
            />
            <ToolbarMenuAction
              label="Align right"
              icon={AlignHorizontalJustifyEnd}
              disabled={!editableSelectedCount}
              onSelect={() => alignSelectedElements("right")}
            />
            <ToolbarMenuAction
              label="Align top"
              icon={AlignVerticalJustifyStart}
              disabled={!editableSelectedCount}
              onSelect={() => alignSelectedElements("top")}
            />
            <ToolbarMenuAction
              label="Align middle"
              icon={AlignVerticalJustifyCenter}
              disabled={!editableSelectedCount}
              onSelect={() => alignSelectedElements("middle")}
            />
            <ToolbarMenuAction
              label="Align bottom"
              icon={AlignVerticalJustifyEnd}
              disabled={!editableSelectedCount}
              onSelect={() => alignSelectedElements("bottom")}
            />
            <ToolbarMenuAction
              label="Distribute horizontally"
              icon={AlignHorizontalDistributeCenter}
              disabled={editableSelectedCount < 3}
              onSelect={() => distributeSelectedElements("horizontal")}
            />
            <ToolbarMenuAction
              label="Distribute vertically"
              icon={AlignVerticalDistributeCenter}
              disabled={editableSelectedCount < 3}
              onSelect={() => distributeSelectedElements("vertical")}
            />
          </ToolbarMenu>

          <ToolbarMenu label="Design">
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            {Object.entries(deckThemes).map(([key, theme]) => (
              <DropdownMenuItem
                key={key}
                onClick={() => setTheme(key as ThemeName)}
              >
                <span className="min-w-0 flex-1 truncate">{theme.label}</span>
                {deck.theme === key ? (
                  <Badge variant="secondary">Active</Badge>
                ) : null}
              </DropdownMenuItem>
            ))}
          </ToolbarMenu>

          <ToolbarMenu label="View">
            <ToolbarMenuAction
              label={showGrid ? "Hide slide grid" : "Show slide grid"}
              icon={Grid2X2}
              onSelect={toggleGrid}
            />
            <ToolbarMenuAction
              label={showRulers ? "Hide slide rulers" : "Show slide rulers"}
              icon={Ruler}
              onSelect={toggleRulers}
            />
          </ToolbarMenu>
        </div>
      </div>

      <div className="relative flex min-h-9 min-w-0 items-center gap-2 overflow-hidden px-2 py-1">
        <div className="fixed -left-[10000px] top-0 h-px w-px overflow-hidden">
          {toolbarLaunchers.map((launcher, index) => (
            <span
              key={launcher.id}
              ref={(node) => {
                toolbarLauncherHostRefs.current[index] = node
              }}
            >
              {launcher.element}
            </span>
          ))}
        </div>

        <div
          ref={toolbarLauncherRailRef}
          className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden"
        >
          {visibleToolbarLaunchers.map((launcher, index) => {
            const Icon = launcher.icon

            return (
              <button
                key={launcher.id}
                type="button"
                className={cn(
                  buttonVariants({ size: "sm", variant: "ghost" }),
                  "h-7 justify-start gap-1.5 overflow-hidden px-2 text-xs font-semibold",
                )}
                style={{ width: launcher.width }}
                onClick={() => openToolbarLauncher(index)}
              >
                <Icon className="size-4 shrink-0" />
                <span className="min-w-0 truncate">{launcher.label}</span>
              </button>
            )
          })}

          {overflowToolbarLaunchers.length ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  buttonVariants({ size: "sm", variant: "ghost" }),
                  "h-7 shrink-0 gap-1.5 px-2 text-xs font-semibold",
                )}
                style={{ width: TOOLBAR_MORE_BUTTON_WIDTH }}
              >
                <MoreHorizontal className="size-4" />
                <span>More</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>More tools</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {overflowToolbarLaunchers.map((launcher, overflowIndex) => {
                  const Icon = launcher.icon
                  const launcherIndex =
                    visibleToolbarLaunchers.length + overflowIndex

                  return (
                    <DropdownMenuItem
                      key={launcher.id}
                      onClick={() => openToolbarLauncher(launcherIndex)}
                    >
                      <Icon className="size-4 text-muted-foreground" />
                      <span>{launcher.label}</span>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <input
          ref={fileInputRef}
          className="hidden"
          type="file"
          accept={deckFileInputAccept}
          onChange={(event) => {
            void openFallbackDeckFile(event.currentTarget.files?.[0])
            event.currentTarget.value = ""
          }}
        />
        <input
          ref={imageInputRef}
          className="hidden"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          onChange={(event) => {
            void importImage(event.currentTarget.files?.[0])
            event.currentTarget.value = ""
          }}
        />
        <input
          ref={audioInputRef}
          className="hidden"
          type="file"
          accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm"
          onChange={(event) => {
            void importAudio(event.currentTarget.files?.[0])
            event.currentTarget.value = ""
          }}
        />
        <input
          ref={videoInputRef}
          className="hidden"
          type="file"
          accept="video/mp4,video/webm,video/ogg"
          onChange={(event) => {
            void importVideo(event.currentTarget.files?.[0])
            event.currentTarget.value = ""
          }}
        />
        <input
          ref={outlineInputRef}
          className="hidden"
          type="file"
          accept="text/plain,text/markdown,.txt,.md"
          onChange={(event) => {
            void importOutline(event.currentTarget.files?.[0])
            event.currentTarget.value = ""
          }}
        />
        <input
          ref={pptxInputRef}
          className="hidden"
          type="file"
          accept={presentationImportInputAccept}
          onChange={(event) => {
            void importPptx(event.currentTarget.files?.[0])
            event.currentTarget.value = ""
          }}
        />
        <input
          ref={imageSlidesInputRef}
          className="hidden"
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          onChange={(event) => {
            void importImagesAsSlides(event.currentTarget.files)
            event.currentTarget.value = ""
          }}
        />
        <FileActionsMenu
          canExportSelectedSlide={Boolean(selectedSlide)}
          currentDeckId={deck.id}
          currentFileStatus={currentFileStatus}
          imageSlideImportReport={imageSlideImportReport}
          odpImportReport={odpImportReport}
          pptxWarningReportId={pptxImportReport?.id}
          pptxWarningReports={pptxImportArchive.reports}
          pptxWarningSource={pptxWarningSource}
          pptxWarnings={pptxImportWarnings}
          recentDecks={recentLocalDecks}
          recoverySnapshots={recoverySnapshots}
          onClearCurrentRecoverySnapshots={clearCurrentRecoverySnapshots}
          onClearImageSlideImportReport={clearRecentImageSlideImportReport}
          onClearOdpImportReport={clearOdpReport}
          onClearPptxWarnings={clearActivePptxReport}
          onClearPptxWarningHistory={clearPptxReportHistory}
          onOpenPptxWarningReport={openPptxReport}
          onOpenDeck={() => void openDeckFile()}
          onOpenRecentDeck={(recentId) => void openRecentDeckFile(recentId)}
          onOpenRecoverySnapshot={openRecoverySnapshot}
          onClearRecentDecks={() => void clearRecentDeckFiles()}
          onClearRecoverySnapshots={clearRecoverySnapshots}
          onSaveDeck={() => void saveDeckToCurrentFile()}
          onSaveDeckAs={() => void saveDeckAsJson()}
          onImportGoogleSlides={() => setGoogleSlidesImportOpen(true)}
          onImportOutline={() => void openOutlineFile()}
          onImportPptx={() => void openPptxFile()}
          onImportImageSlides={() => void openImageSlidesFiles()}
          onExportPptx={() => void exportNativePptx()}
          onExportPdf={() => void exportPdf()}
          onExportSlideSvg={() => void exportSelectedSlideSvg()}
          onExportSlidePng={() => void exportSelectedSlidePng()}
        />
        <FileBackstageDialog
          canExportSelectedSlide={Boolean(selectedSlide)}
          currentFileStatus={currentFileStatus}
          deck={deck}
          cloudDeckMessage={backstageCloudDeckMessage}
          cloudDecks={recentCloudDecks}
          cloudDecksWorking={backstageCloudDeckWorking}
          cloudPinnedDeckIds={pinnedCloudDeckIds}
          cloudSignedIn={Boolean(session?.user)}
          imageSlideImportReport={imageSlideImportReport}
          odpImportReport={odpImportReport}
          pptxWarningReportId={pptxImportReport?.id}
          pptxWarningReports={pptxImportArchive.reports}
          pptxWarnings={pptxImportWarnings}
          recentDecks={recentLocalDecks}
          recoverySnapshots={recoverySnapshots}
          onClearCurrentRecoverySnapshots={clearCurrentRecoverySnapshots}
          onClearImageSlideImportReport={clearRecentImageSlideImportReport}
          onClearOdpImportReport={clearOdpReport}
          onClearPptxWarnings={clearActivePptxReport}
          onClearPptxWarningHistory={clearPptxReportHistory}
          onForgetRecentCloudDeck={forgetRecentCloudDeckShortcut}
          onOpenPptxWarningReport={openPptxReport}
          onOpenDeck={() => void openDeckFile()}
          onOpenRecentCloudDeck={(deckId) =>
            void openRecentCloudDeckShortcut(deckId)
          }
          onOpenRecentDeck={(recentId) => void openRecentDeckFile(recentId)}
          onForgetRecentDeck={(recentId) => void forgetRecentDeckFile(recentId)}
          onOpenRecoverySnapshot={openRecoverySnapshot}
          onClearRecentDecks={() => void clearRecentDeckFiles()}
          onClearStaleRecentDecks={() =>
            void clearStaleRecentDeckFileEntries()
          }
          onClearRecoverySnapshots={clearRecoverySnapshots}
          onSaveDeck={() => void saveDeckToCurrentFile()}
          onSaveDeckAs={() => void saveDeckAsJson()}
          onToggleCloudDeckPin={toggleBackstageCloudDeckPin}
          onToggleRecentDeckPin={(recentId, pinned) =>
            void toggleRecentDeckPin(recentId, pinned)
          }
          onRefreshCloudDeckShortcuts={refreshBackstageCloudDeckShortcuts}
          onImportGoogleSlides={() => setGoogleSlidesImportOpen(true)}
          onImportOutline={() => void openOutlineFile()}
          onImportPptx={() => void openPptxFile()}
          onImportImageSlides={() => void openImageSlidesFiles()}
          onExportPptx={() => void exportNativePptx()}
          onExportPdf={() => void exportPdf()}
          onExportSlideSvg={() => void exportSelectedSlideSvg()}
          onExportSlidePng={() => void exportSelectedSlidePng()}
        />
        <PptxCompatibilityReviewDialog
          activeReport={pptxImportReport}
          reports={pptxImportArchive.reports}
          onClearActiveReport={clearActivePptxReport}
          onClearReports={clearPptxReportHistory}
          onSelectReport={openPptxReport}
        />
        <GoogleSlidesImportDialog
          open={googleSlidesImportOpen}
          onImport={importGoogleSlidesLink}
          onOpenChange={setGoogleSlidesImportOpen}
        />
        <LocalRecoveryReviewDialog
          currentDeck={deck}
          snapshots={recoverySnapshots}
          onClearSnapshots={clearRecoverySnapshots}
          onDeleteSnapshot={deleteRecoverySnapshot}
          onRestoreSnapshot={openRecoverySnapshot}
        />
        <ImageSlideImportReviewDialog
          items={imageSlideImportItems}
          open={imageSlideImportReviewOpen}
          onConfirm={confirmImageSlideImport}
          onMoveItem={movePendingImageSlide}
          onOpenChange={closeImageSlideImportReview}
          onRemoveItem={removePendingImageSlide}
        />
        <ImageSlideImportReportDialog
          assets={deck.assets}
          master={deck.master}
          report={imageSlideImportReport}
          slides={deck.slides}
          onClearReport={clearRecentImageSlideImportReport}
          onSelectSlideNumber={selectImageImportReportSlide}
        />
        {embedded ? null : (
          <>
            <CloudSyncPanel />
            <PresenceIndicator />
            <AuthPanel />
          </>
        )}
        </div>
      </div>
    </header>
  )
}
