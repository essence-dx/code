import { DOMParser as XmldomDOMParser } from "@xmldom/xmldom"
import { strFromU8, strToU8, unzipSync } from "fflate"

import { compactDeckAssets } from "../src/features/presentation/asset-health"
import {
  actionButtonInsertPayload,
  actionButtonStylePayload,
  actionButtonTargetSlideId,
  actionButtonTemplates,
} from "../src/features/presentation/action-button-templates"
import {
  actionButtonHandoffCues,
  deckActionButtonHandoffReport,
  serializeSlideActionSettingNotes,
  serializeActionButtonHandoffReport,
} from "../src/features/presentation/action-button-handoff"
import { pptxActionSettingPlan } from "../src/features/presentation/pptx-action-settings"
import {
  pptxActionXmlAuthoring,
  serializePptxActionXmlAuthoring,
} from "../src/features/presentation/pptx-action-xml-authoring"
import {
  officeActionAnimationReviewPlan,
  serializeOfficeActionAnimationReviewPlan,
} from "../src/features/presentation/office-action-animation-review"
import {
  chartDataFromSeries,
  chartSeries,
  chartSeriesFromTsv,
  chartSeriesToTsv,
  chartText,
  hasMultiSeriesChart,
} from "../src/features/presentation/chart-formatting"
import {
  applyBrandKitToDeck,
  brandKitPresets,
} from "../src/features/presentation/brand-kits"
import type {
  CloudDeckCollaborationEvent,
  CloudDeckSummary,
} from "../src/features/presentation/cloud-api"
import {
  collaborationCursorFromEvent,
  recentCollaborationCursors,
} from "../src/features/presentation/collaboration-cursors"
import { compatibilityRepairReport } from "../src/features/presentation/compatibility-repair-report"
import {
  linkedDataRepairWorkflowReport,
  serializeLinkedDataRepairWorkflowReport,
} from "../src/features/presentation/linked-data-repair-workflows"
import {
  importExportRepairLoopReport,
  serializeImportExportRepairLoopReport,
} from "../src/features/presentation/import-export-repair-loop"
import {
  officeInteroperabilityRepairPlan,
  serializeOfficeInteroperabilityRepairPlan,
} from "../src/features/presentation/office-interoperability-repair-plan"
import { cloudDeckShortcutReadiness } from "../src/features/presentation/recent-cloud-decks"
import {
  collaborationActivityLabel,
  shouldShowPresenceActivity,
} from "../src/features/presentation/collaboration-activity"
import {
  applyCollaborationObjectMutation,
  collaborationMutationApplySummary,
  collaborationMutationSkipDetails,
} from "../src/features/presentation/collaboration-mutation-reconciliation"
import {
  collaborationMutationFromEvent,
  collaborationMutationPayloadFromElements,
  recentCollaborationMutations,
} from "../src/features/presentation/collaboration-mutations"
import {
  designPaletteFromDeck,
  parseCustomDesignPalettesText,
  recommendedCustomDesignPalettes,
  serializeCustomDesignPalettes,
} from "../src/features/presentation/custom-design-palettes"
import {
  customBrandKitFromDeck,
  parseCustomBrandKitsText,
  recommendedCustomBrandKits,
  serializeCustomBrandKits,
} from "../src/features/presentation/custom-brand-kits"
import {
  deckDiagramAuthoringReport,
  serializeDiagramAuthoringReport,
} from "../src/features/presentation/diagram-authoring-report"
import {
  diagramElementSpecs,
  diagramGroupIdForTemplate,
  diagramTemplateIdFromGroupId,
  diagramTemplates,
} from "../src/features/presentation/diagram-templates"
import {
  applyCustomSlideLayout,
  applyCustomSlideLayoutToSlides,
  customSlideLayoutFromSlide,
  importCustomSlideLayoutsFromText,
  parseCustomSlideLayoutsText,
  serializeCustomSlideLayouts,
} from "../src/features/presentation/custom-slide-layouts"
import {
  deleteDeckLayoutPreset,
  importDeckLayoutPresetsToMaster,
  markDeckLayoutPresetUsed,
  parseDeckLayoutPresetsText,
  recommendedDeckLayoutPresets,
  saveDeckLayoutPreset,
  serializeDeckLayoutPresets,
  updateDeckLayoutPreset,
  updateDeckLayoutPresetSlot,
} from "../src/features/presentation/deck-layout-presets"
import { masterLayoutVariantsForPreset } from "../src/features/presentation/master-layout-variants"
import { masterThemeSafeguardReport } from "../src/features/presentation/master-theme-safeguards"
import {
  officeThemeVariantRepairReport,
  serializeOfficeThemeVariantRepairReport,
} from "../src/features/presentation/office-theme-variant-repair"
import {
  nativeOfficePackageParityReport,
  serializeNativeOfficePackageParityReport,
} from "../src/features/presentation/native-office-package-parity"
import {
  nativePptxMasterXmlPlan,
  serializeNativePptxMasterXmlPlan,
} from "../src/features/presentation/pptx-master-xml-plan"
import { nativePptxMasterLayoutPlan } from "../src/features/presentation/pptx-master-layout-export"
import {
  pptxMasterXmlAuthoringPlan,
  serializePptxMasterXmlAuthoringPlan,
} from "../src/features/presentation/pptx-master-xml-authoring"
import {
  pptxMasterLayoutXmlAuthoring,
  serializePptxMasterLayoutXmlAuthoring,
} from "../src/features/presentation/pptx-master-layout-xml-authoring"
import { serializePptxThemePackagePlan } from "../src/features/presentation/pptx-theme-package-plan"
import {
  pptxThemePackageXmlAuthoring,
  serializePptxThemePackageXmlAuthoring,
} from "../src/features/presentation/pptx-theme-package-xml-authoring"
import {
  applyNativePptxPackageAuthoringToEntries,
  pptxNativePackageAuthoring,
  serializePptxNativePackageAuthoring,
} from "../src/features/presentation/pptx-native-package-authoring"
import {
  normalizeOfficeThemeMetadata,
  officeThemeMetadataFromPptxThemeXml,
  officeThemePptxFontFaces,
} from "../src/features/presentation/office-theme-metadata"
import {
  applyFontPairToDeck,
  fontPairPresets,
  normalizeFontFamily,
} from "../src/features/presentation/font-pairs"
import {
  collaborationSelectionFromEvent,
  recentCollaborationSelections,
} from "../src/features/presentation/collaboration-selections"
import { organizeCloudDecks } from "../src/features/presentation/cloud-deck-browser"
import { withImageAsset } from "../src/features/presentation/deck-assets"
import {
  canvasElementContainmentStyle,
  canvasRenderBudget,
  shouldCheckTextOverflow,
} from "../src/features/presentation/canvas-render-budget"
import {
  largeDeckSafeguardReport,
  largeDeckWindowLimits,
  slideAnchorWindowPlan,
  virtualFilmstripWindow,
} from "../src/features/presentation/large-deck-windowing"
import {
  deckScaleLimits,
  deckScaleLabel,
  deckScaleMetrics,
  trimDeckHistory,
} from "../src/features/presentation/deck-performance"
import { desktopBridgeReadinessFromCapabilities } from "../src/features/presentation/desktop-bridge-readiness"
import {
  desktopMenuContractFromReadiness,
  isDesktopMenuCommandId,
} from "../src/features/presentation/desktop-menu-contract"
import {
  desktopFileCommandPayloadForCommand,
  desktopFileCommandPayloadsFromReadiness,
  desktopRecentFileHandoffSummary,
} from "../src/features/presentation/desktop-file-command-payloads"
import {
  desktopLocalFileDiagnosticsReport,
  serializeDesktopLocalFileDiagnosticsReport,
} from "../src/features/presentation/desktop-local-file-diagnostics"
import {
  desktopRecentDocumentWriterPlan,
  serializeDesktopRecentDocumentWriterPlan,
} from "../src/features/presentation/desktop-recent-documents"
import {
  desktopPackagingReadinessReport,
  serializeDesktopPackagingReadinessReport,
} from "../src/features/presentation/desktop-packaging-readiness"
import {
  deckFileAcceptExtensions,
  deckFileName,
  essenceDeckFileExtension,
  essenceDeckMimeType,
} from "../src/features/presentation/deck-file-format"
import {
  desktopReleaseRegistrationReport,
  serializeDesktopReleaseRegistrationReport,
} from "../src/features/presentation/desktop-release-registration"
import {
  desktopReleaseFileAssociations,
  desktopReleaseGates,
} from "../src/features/presentation/desktop-release-profile"
import {
  desktopFileDialogRequest,
  readNativeDesktopFiles,
  registerNativeDesktopRecentDocument,
  writeNativeDesktopFile,
} from "../src/features/presentation/desktop-native-file-api"
import {
  desktopMediaResolverPlan,
  pptxMediaExportOptionsFromResolvedDesktopMedia,
} from "../src/features/presentation/desktop-media-resolver"
import {
  imageSlideImportReportFromItems,
  imageSlideImportSummary,
  serializeImageSlideImportReportText,
  imageSlideOrientation,
  moveImageSlideImportItem,
  removeImageSlideImportItem,
  type ImageSlideImportItem,
} from "../src/features/presentation/image-slide-import-review"
import {
  exportedDeckSignature,
  localDeckFileSessionFromExportedDeck,
  localDeckFileStatus,
  serializeExportedDeck,
} from "../src/features/presentation/local-deck-file-state"
import { fileBackstageReadinessReport } from "../src/features/presentation/file-backstage-readiness"
import {
  organizeRecentLocalDeckFiles,
  recentLocalDeckStaleCutoff,
  sortRecentLocalDeckFiles,
  type RecentLocalDeckFile,
} from "../src/features/presentation/recent-local-deck-files"
import {
  forgetLocalDeckRecoverySnapshotsForDeckInList,
  localDeckRecoverySnapshotFromExportedDeck,
  rememberLocalDeckRecoveryRestoreCheckpointInList,
  rememberLocalDeckRecoverySnapshotInList,
} from "../src/features/presentation/local-deck-recovery"
import {
  localDeckRecoveryReview,
  localDeckRecoverySnapshotFileName,
  serializeLocalDeckRecoveryReviewText,
  serializeLocalDeckRecoverySnapshotJson,
} from "../src/features/presentation/local-deck-recovery-review"
import {
  pptxCompatibilityWarningMessage,
  pptxCompatibilityWarningsFromEntries,
} from "../src/features/presentation/pptx-compatibility"
import {
  activePptxCompatibilityReport,
  parsePptxCompatibilityReportArchive,
  parsePptxCompatibilityReport,
  pptxCompatibilityReportFileName,
  pptxCompatibilityReportFromWarnings,
  serializePptxCompatibilityReportText,
} from "../src/features/presentation/pptx-compatibility-history"
import { compareDeckVersions } from "../src/features/presentation/deck-conflict-preview"
import {
  createDeckFromTemplateVariant,
  templatePreviewDeck,
} from "../src/features/presentation/deck-templates"
import {
  createDeckFromCustomTemplate,
  customDeckTemplateFromDeck,
  customDeckTemplateStats,
  markCustomDeckTemplateUsedInList,
  parseCustomDeckTemplatesText,
  recommendedCustomDeckTemplates,
  serializeCustomDeckTemplates,
} from "../src/features/presentation/custom-deck-templates"
import {
  applyThemeBundleToDeck,
  builtInThemeBundles,
  deleteThemeBundlesFromList,
  importThemeBundlesFromText,
  markThemeBundleUsedInList,
  parseThemeBundlesText,
  serializeThemeBundles,
  themeBundleCleanupAudit,
  themeBundleFromDeck,
} from "../src/features/presentation/theme-bundles"
import {
  parseStandaloneThemeFile,
  serializeStandaloneThemeFile,
  standaloneThemeFileName,
  standaloneThemeFilePayloadFromDeck,
  standaloneThemeFileSummary,
  themeBundleFromStandaloneThemeFile,
} from "../src/features/presentation/theme-file-portability"
import {
  serializeTemplatePackageManifest,
  templatePackageManifest,
} from "../src/features/presentation/template-package-manifest"
import {
  customMasterStylePresetFromMaster,
  parseCustomMasterStylePresetsText,
  serializeCustomMasterStylePresets,
} from "../src/features/presentation/custom-master-style-presets"
import {
  applyMasterStylePreset,
  masterStylePresetMatches,
  masterStylePresetPreview,
  masterStylePresets,
} from "../src/features/presentation/master-style-presets"
import { reusableAssetAudit } from "../src/features/presentation/reusable-asset-audit"
import {
  odpImportPreflightFromEntries,
  parseOdpImportPreflightReport,
  type OdpImportPreflightReport,
} from "../src/features/presentation/odp-import-preflight"
import { importOdpDeckFromEntries } from "../src/features/presentation/odp-import"
import { objectConversionReport } from "../src/features/presentation/object-conversion-report"
import {
  applyNativePptxAnimationsToEntries,
  nativePptxAnimationExportPlanForSlide,
  nativePptxAnimationTargetsForSlide,
  nativePptxTimingXmlForTargets,
} from "../src/features/presentation/pptx-animation-xml"
import {
  animationPaneItemsForSlide,
  animationPaneSummary,
  moveAnimatedElementInOrder,
} from "../src/features/presentation/animation-pane"
import {
  elementAnimationClass,
  elementAnimationKind,
  elementAnimationLabels,
  elementAnimationMotionX,
  elementAnimationMotionY,
  elementAnimationTrigger,
  elementAnimationTriggerLabels,
} from "../src/features/presentation/animation-effects"
import {
  sequencedSlideElements,
  shouldPlaySequencedElementAnimation,
  shouldShowSequencedElement,
} from "../src/features/presentation/slideshow-sequence"
import {
  serializePptxAnimationHandoffNotes,
  slideAnimationHandoffCues,
} from "../src/features/presentation/pptx-animation-handoff"
import {
  serializeSharedViewReviewReport,
  sharedViewReviewItems,
  sharedViewReviewSnapshot,
} from "../src/features/presentation/shared-view-review"
import {
  collaborationReviewHandoffItems,
  collaborationReviewHandoffSnapshot,
  serializeCollaborationReviewHandoff,
} from "../src/features/presentation/collaboration-review-handoff"
import {
  collaborationReviewExportChoices,
  collaborationReviewOperationsSnapshot,
  collaborationReviewerMergePreview,
  serializeCollaborationReviewOperationsSnapshot,
} from "../src/features/presentation/collaboration-review-operations"
import {
  pptxCommentThreadPlan,
  serializePptxCommentThreadPlan,
} from "../src/features/presentation/pptx-comment-thread-plan"
import {
  pptxCommentXmlAuthoring,
  serializePptxCommentXmlAuthoring,
} from "../src/features/presentation/pptx-comment-xml-authoring"
import {
  reviewThreadLifecycleItems,
  reviewThreadLifecycleSummary,
} from "../src/features/presentation/review-thread-lifecycle"
import {
  serializePptxConnectorHandoffNotes,
  slideConnectorHandoffCues,
} from "../src/features/presentation/pptx-connector-handoff"
import { pptxConnectorCustomGeometryPoints } from "../src/features/presentation/pptx-connector-geometry"
import {
  serializePptxTransitionHandoffNotes,
  slideTransitionHandoffCue,
} from "../src/features/presentation/pptx-transition-handoff"
import {
  applyNativePptxTransitionsToEntries,
  nativePptxTransitionXmlForSlide,
} from "../src/features/presentation/pptx-transition-xml"
import {
  pptxChartDataSeries,
  pptxChartExportMode,
} from "../src/features/presentation/pptx-chart-export"
import { deckPdfFileName } from "../src/features/presentation/pdf-export"
import { pptxExportPreflight } from "../src/features/presentation/pptx-export-preflight"
import {
  pptxExportPreflightSnapshotFileName,
  pptxExportPreflightSnapshotSections,
  serializePptxExportPreflightSnapshot,
} from "../src/features/presentation/pptx-export-preflight-snapshot"
import {
  deckPptxFileName,
  exportDeckToPptxBlob,
} from "../src/features/presentation/pptx-export"
import {
  deckPptxMediaExportReport,
  pptxMediaExportDecision,
  serializePptxMediaExportHandoffNotes,
} from "../src/features/presentation/pptx-media-export"
import {
  applyTableCellBorderToRange,
  applyTableCellStyleToRange,
  clearTableCellStyleRange,
  mergeTableCells,
  mergeTableCellRange,
  normalizeTableCellRange,
  resizeTableCells,
  splitTableCells,
  splitTableCellRange,
  tableCellFormat,
  tableCellMerges,
  tableCellRangeLabel,
  tableCellRangeMergeCount,
  tableCellRangeStyleCount,
  tableCellStyles,
  tableCellsToTsvForRange,
  tableDisplayCells,
  updateTableCellsInRange,
} from "../src/features/presentation/table-formatting"
import {
  createDefaultDeck,
  createElement,
  createOutlineSlide,
  createSlide,
} from "../src/features/presentation/default-deck"
import {
  elementSlideTarget,
  elementSlideTargetDiagnostic,
  normalizeElementLinkUrl,
} from "../src/features/presentation/element-links"
import {
  alignSlideElements,
  distributeSlideElements,
  elementBounds,
  elementIdsInRect,
  nudgeSlideElements,
  resizeElementPatches,
  rotateElementPatches,
} from "../src/features/presentation/selection-commands"
import { migrateDeckAssets } from "../src/features/presentation/deck-assets"
import {
  mediaCaptionCues,
  parseMediaCaptionCues,
  serializeMediaCaptionHandoffNotes,
  serializeMediaCaptionVtt,
} from "../src/features/presentation/media-captions"
import {
  mediaRecordingDurationLabel,
  mediaRecordingFileName,
  mediaRecordingModeReadiness,
  mediaRecordingOutputType,
  mediaRecordingReplacementPlan,
  preferredMediaRecordingMimeType,
} from "../src/features/presentation/media-recording"
import { mediaEditingReview } from "../src/features/presentation/media-editing-review"
import {
  deckMediaHandoffReport,
  isNativePptxMediaEmbeddable,
  isNativeMediaSourceCandidate,
  mediaHandoffReport,
  mediaRecordingReadiness,
  mediaSourceKind,
} from "../src/features/presentation/media-handoff"
import { parseOutlineSlides } from "../src/features/presentation/outline-import"
import {
  importPptxDeckWithReport,
  pptxCommentAuthorsFromXml,
  pptxSlideCommentsFromXml,
  pptxSlideTransitionFromXml,
} from "../src/features/presentation/pptx-import"
import { presenterReadinessReport } from "../src/features/presentation/presenter-readiness"
import {
  richTextSegments,
  richTextSelectionState,
  toggleRichTextRange,
} from "../src/features/presentation/rich-text"
import {
  connectorPointPatchFromPosition,
  connectorPointPosition,
  shapeConnectorGeometry,
  shapeConnectorPath,
  shapeLineEndpoints,
} from "../src/features/presentation/shape-geometry"
import { applyLayoutPlaceholders } from "../src/features/presentation/slide-layouts"
import { normalizeDeckMaster } from "../src/features/presentation/slide-master"
import {
  createPresentationPersistenceSnapshot,
  mergePresentationPersistedState,
  type PresentationPersistenceState,
} from "../src/features/presentation/store-persistence"
import {
  canMoveSlideSection,
  deckSections,
  moveSlideSection,
  renameSlideSection,
  sanitizeCollapsedSectionSlideIds,
  sectionRangeForSlide,
} from "../src/features/presentation/slide-sections"
import { sectionExportSummary } from "../src/features/presentation/section-export-summary"
import { slidePngFileName } from "../src/features/presentation/slide-raster-export"
import {
  deckPrintFileName,
  serializeDeckToPrintHtml,
  serializeSlideToSvg,
  slideSvgFileName,
} from "../src/features/presentation/slide-svg-export"
import {
  extractCommentMentions,
  openMentionCount,
} from "../src/features/presentation/comment-mentions"
import { resolveAdminAccess } from "../src/server/admin/access-policy"
import { resolveAdminUserUpdate } from "../src/server/admin/user-update-policy"
import { parseDeckCollaboratorUpsert } from "../src/server/decks/collaborators"
import { parseDeckCollaborationEvent } from "../src/server/decks/collaboration-events"
import {
  resolveDeckActorRole,
  resolveDeckOperationAccess,
} from "../src/server/decks/access-policy"
import { resolveDeckShareUpdate } from "../src/server/decks/share-update-policy"
import { parseDeckPayload } from "../src/server/decks/validation"
import {
  presenceInitials,
  resolvePresenceHeartbeat,
} from "../src/server/presence/policy"
import {
  cleanNotificationMentionKey,
  notificationCommentPreview,
  notificationMentionKeysForUser,
  shareViewDedupeCutoff,
} from "../src/server/notifications/policy"
import {
  cloudSyncE2eFlows,
  validateCloudSyncE2eContract,
} from "../src/features/presentation/cloud-sync-e2e-contract"
import { cloudSyncTestIds } from "../src/features/presentation/cloud-sync-test-ids"
import { cloudSyncE2eReadinessReport } from "../src/features/presentation/cloud-sync-e2e-readiness"
import {
  presentationBrowserSmokeFlows,
  presentationBrowserSmokeReadinessReport,
  validatePresentationBrowserSmokeContract,
} from "../src/features/presentation/presentation-browser-smoke-contract"
import {
  runPresentationBrowserSmokeFlow,
  selectedPresentationBrowserSmokeFlows,
  type PresentationSmokeDriver,
} from "../src/features/presentation/presentation-browser-smoke-runner"
import {
  presentationSmokeExecutionReadinessReport,
  serializePresentationSmokeExecutionReadinessReport,
} from "../src/features/presentation/presentation-smoke-execution-readiness"
import {
  presentationSmokeRunnerBridgeReport,
  serializePresentationSmokeRunnerBridgeReport,
} from "../src/features/presentation/presentation-smoke-runner-bridge"
import {
  presentationPerformancePressureReport,
  presentationProductionReadinessReport,
} from "../src/features/presentation/presentation-production-readiness"
import {
  releaseAutomationHandoffReport,
  serializeReleaseAutomationHandoffJson,
  serializeReleaseAutomationHandoffReport,
} from "../src/features/presentation/release-automation-handoff"
import {
  releaseEnvironmentReadinessReport,
  serializeReleaseEnvironmentReadinessReport,
} from "../src/features/presentation/release-environment-readiness"
import {
  cloudDataHealthReport,
  serializeCloudDataHealthReport,
} from "../src/features/presentation/cloud-data-health"
import {
  productionDataOperationsReport,
  serializeProductionDataOperationsReport,
} from "../src/features/presentation/production-data-operations"
import {
  productionReadinessHealthReport,
  serializeProductionReadinessHealthJson,
  serializeProductionReadinessHealthReport,
} from "../src/features/presentation/production-readiness-health"
import {
  serializeSmokeFixtureReadinessReport,
  smokeFixtureReadinessReport,
} from "../src/features/presentation/smoke-fixture-readiness"
import {
  serializeSmokeFixtureExecutionPlanReport,
  smokeFixtureExecutionPlanReport,
} from "../src/features/presentation/smoke-fixture-execution-plan"
import {
  serializeSmokeFixtureLifecyclePlan,
  serializeSmokeFixtureLifecyclePlanJson,
  smokeFixtureLifecyclePlan,
} from "../src/features/presentation/smoke-fixture-lifecycle"
import {
  filterPresentationCommandPaletteActions,
  presentationCommandPaletteActions,
} from "../src/features/presentation/app-shell-command-palette"
import {
  workspacePanelWidthLimits,
  workspaceErgonomicsReport,
} from "../src/features/presentation/workspace-ergonomics"
import { scanDeckAccessibility } from "../src/features/presentation/accessibility-checker"
import {
  accessibilityKeyboardParityReport,
  presentationKeyboardShortcuts,
  serializeAccessibilityKeyboardParityReport,
} from "../src/features/presentation/accessibility-keyboard-parity"
import { presentationSmokeTestIds } from "../src/features/presentation/presentation-smoke-test-ids"
import {
  cloudSyncSelector,
  createCloudSyncLocatorDriver,
  runCloudSyncE2eFlow,
} from "../src/features/presentation/cloud-sync-e2e-runner"
import type {
  Deck,
  DeckAsset,
  DeckLayoutPreset,
  PresentationElement,
  Slide,
} from "../src/features/presentation/types"
import { mergeRegressionCases } from "./presentation-merge-regression-cases"
import {
  assert,
  assertArrayEqual,
  assertEqual,
  type RegressionCase,
} from "./presentation-regression-utils"

if (!globalThis.DOMParser) {
  globalThis.DOMParser = XmldomDOMParser as unknown as typeof DOMParser
}

const presentationNamespace =
  "http://schemas.openxmlformats.org/presentationml/2006/main"

function imageElement(element: PresentationElement | undefined) {
  assert(element?.type === "image", "Expected an image element")
  return element
}

function deckWithSingleElement(element: PresentationElement): Deck {
  const deck = createDefaultDeck()
  const [firstSlide, ...restSlides] = deck.slides

  assert(firstSlide, "Default deck should include a first slide")

  return {
    ...deck,
    slides: [
      {
        ...firstSlide,
        elements: [element],
      },
      ...restSlides,
    ],
  }
}

function slideWithElements(elements: PresentationElement[]) {
  const [slide] = createDefaultDeck().slides

  assert(slide, "Default deck should include a first slide")

  return {
    ...slide,
    elements,
  }
}

const tinyPngDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lRVXswAAAABJRU5ErkJggg=="

function utf8(value: string) {
  return new TextEncoder().encode(value)
}

const regressionCases: RegressionCase[] = [
  {
    name: "default deck keeps an editable opening structure",
    run() {
      const deck = createDefaultDeck()

      assertEqual(deck.title, "Essence presentation", "Default deck title changed")
      assertEqual(deck.slides.length, 2, "Default deck slide count changed")
      assertEqual(deck.slides[0]?.layout, "title", "Opening slide layout changed")
      assert(deck.slides[0]?.elements.some((element) => element.type === "title"), "Opening slide should include a title element")
    },
  },
  {
    name: "slide section helpers rename, move, and sanitize section state",
    run() {
      const deck = createDefaultDeck()
      const [firstSlide, secondSlide] = deck.slides
      assert(firstSlide && secondSlide, "Default deck should include two slides")

      const introSlide = {
        ...firstSlide,
        id: "intro",
        sectionTitle: "Intro",
      }
      const detailSlide = {
        ...secondSlide,
        id: "detail",
        sectionTitle: "",
      }
      const workSlide = {
        ...createSlide(3),
        id: "work",
        sectionTitle: "Work",
      }
      const closeSlide = {
        ...createSlide(4),
        id: "close",
        sectionTitle: "",
      }
      const slides = [introSlide, detailSlide, workSlide, closeSlide]

      const sections = deckSections(slides)
      assertEqual(sections.length, 2, "Explicit section count should be stable")
      assertArrayEqual(
        sections[0]?.slideIds ?? [],
        ["intro", "detail"],
        "Intro section should include slides until the next section break",
      )

      const activeRange = sectionRangeForSlide(slides, "detail")
      assertEqual(
        activeRange?.startSlideId,
        "intro",
        "Section range should resolve from an interior slide",
      )

      const renamed = renameSlideSection(slides, "detail", "  Kickoff  ")
      assert(renamed.changed, "Renaming an active section should change slides")
      assertEqual(
        renamed.slides[0]?.sectionTitle,
        "Kickoff",
        "Section names should be trimmed and stored on the section break",
      )

      const moved = moveSlideSection(renamed.slides, "intro", 1)
      assert(moved.changed, "Moving a section down should change slide order")
      assertArrayEqual(
        moved.slides.map((slide) => slide.id),
        ["work", "close", "intro", "detail"],
        "Moving a section should reorder the whole section block",
      )
      assertArrayEqual(
        moved.selectedSlideIds,
        ["intro", "detail"],
        "Moved section slides should stay selected as a block",
      )
      assert(
        canMoveSlideSection(moved.slides, "intro", -1),
        "Moved section should be able to move back up",
      )
      assertArrayEqual(
        sanitizeCollapsedSectionSlideIds(moved.slides, [
          "intro",
          "detail",
          "missing",
        ]),
        ["intro"],
        "Collapsed section persistence should keep only real section breaks",
      )
    },
  },
  {
    name: "outline import keeps headings and body text separated",
    run() {
      const slides = parseOutlineSlides("# Roadmap\nFirst point\nSecond point\n\n## Closing")

      assertEqual(slides.length, 2, "Outline should create two slides")
      assertEqual(slides[0]?.title, "Roadmap", "Heading marker should be stripped")
      assertEqual(slides[0]?.body, "First point\nSecond point", "Body lines should be preserved")
      assertEqual(slides[1]?.title, "Closing", "Second heading should become a title")
    },
  },
  {
    name: "outline slide generation uses title-only layout when there is no body",
    run() {
      const slide = createOutlineSlide(3, { title: "Only title", body: "" })

      assertEqual(slide.layout, "title", "Empty outline body should create a title slide")
      assertEqual(slide.elements.length, 1, "Title-only outline slide should have one element")
    },
  },
  {
    name: "image slide import review summarizes reorders and removes files",
    run() {
      const items: ImageSlideImportItem[] = [
        {
          alt: "Cover.png",
          height: 1080,
          id: "cover",
          orientation: "landscape",
          size: 1000,
          src: "data:image/png;base64,cover",
          type: "image/png",
          width: 1920,
        },
        {
          alt: "Cover.png",
          height: 1600,
          id: "appendix",
          orientation: "portrait",
          size: 2400,
          src: "data:image/webp;base64,appendix",
          type: "image/webp",
          width: 900,
        },
      ]
      const summary = imageSlideImportSummary(items)
      const moved = moveImageSlideImportItem(items, "appendix", -1)
      const removed = removeImageSlideImportItem(moved, "cover")
      const report = imageSlideImportReportFromItems(moved, {
        importedAt: new Date("2026-05-15T05:00:00.000Z"),
        startingSlideNumber: 6,
      })

      assertEqual(summary.totalSlides, 2, "Image import review should count staged slides")
      assertEqual(summary.totalBytes, 3400, "Image import review should total file sizes")
      assertArrayEqual(
        summary.fileTypes,
        ["image/png", "image/webp"],
        "Image import review should summarize unique file types",
      )
      assertEqual(
        summary.orientationCounts.landscape,
        1,
        "Image import review should count landscape files",
      )
      assertArrayEqual(
        summary.duplicateNames,
        ["cover.png"],
        "Image import review should flag duplicate file names",
      )
      assertEqual(
        imageSlideOrientation({ height: 1200, width: 1200 }),
        "square",
        "Image orientation should classify square images",
      )
      assertEqual(
        moved[0]?.id,
        "appendix",
        "Image import review should support order changes before insertion",
      )
      assertEqual(
        removed.length,
        1,
        "Image import review should support removing a staged image",
      )
      assertEqual(
        report.endingSlideNumber,
        7,
        "Image import reports should record the inserted slide range",
      )
      assert(
        serializeImageSlideImportReportText(report).includes("6. Cover.png"),
        "Image import reports should serialize inserted slide numbers",
      )
    },
  },
  {
    name: "links normalize safe URLs and reject unsafe schemes",
    run() {
      assertEqual(
        normalizeElementLinkUrl("example.com/path"),
        "https://example.com/path",
        "Bare domains should normalize to HTTPS",
      )
      assertEqual(normalizeElementLinkUrl("javascript:alert(1)"), "", "Unsafe schemes should be rejected")
      assertEqual(
        elementSlideTarget({ linkSlideId: "slide-2" }, [{ id: "slide-1" }, { id: "slide-2" }]),
        "slide-2",
        "Known internal slide target should be preserved",
      )
      assertEqual(
        elementSlideTarget({ linkSlideId: "missing" }, [{ id: "slide-1" }]),
        "",
        "Unknown internal slide target should be cleared",
      )
      assertEqual(
        elementSlideTargetDiagnostic(
          { linkSlideId: "slide-1" },
          [{ id: "slide-1", title: "Intro" }],
          "slide-1",
        ).status,
        "self",
        "Self-targeted slide actions should be diagnosed",
      )
      assertEqual(
        elementSlideTargetDiagnostic(
          { linkSlideId: "missing" },
          [{ id: "slide-1", title: "Intro" }],
        ).status,
        "missing",
        "Missing slide actions should be diagnosed",
      )
    },
  },
  {
    name: "action button templates resolve target slides and style payloads",
    run() {
      const slides = [{ id: "slide-1" }, { id: "slide-2" }, { id: "slide-3" }]
      const nextTemplate = actionButtonTemplates.find(
        (template) => template.id === "next",
      )
      const lastTemplate = actionButtonTemplates.find(
        (template) => template.id === "last",
      )

      assert(nextTemplate, "Next action button template should exist")
      assert(lastTemplate, "Last action button template should exist")
      assertEqual(
        actionButtonTargetSlideId("previous", slides, "slide-1"),
        "",
        "Previous action should be disabled on the first slide",
      )
      assertEqual(
        actionButtonTargetSlideId("next", slides, "slide-1"),
        "slide-2",
        "Next action should target the following slide",
      )

      const nextPayload = actionButtonInsertPayload(
        nextTemplate,
        slides,
        "slide-1",
      )
      const lastPayload = actionButtonInsertPayload(
        lastTemplate,
        slides,
        "slide-1",
      )

      assertEqual(
        nextPayload?.shapeKind,
        "rightArrow",
        "Next action payload should carry its styled shape kind",
      )
      assertEqual(
        nextPayload?.foreground,
        "#ffffff",
        "Action payloads should preserve foreground color",
      )
      assertEqual(
        actionButtonStylePayload(nextTemplate, "outline").background,
        "#ffffff",
        "Outline action variants should produce a white button fill",
      )
      assertEqual(
        actionButtonInsertPayload(nextTemplate, slides, "slide-1", "dark")
          ?.background,
        "#111827",
        "Dark action variants should override the button fill",
      )
      assertEqual(
        lastPayload?.linkSlideId,
        "slide-3",
        "Last action payload should target the last slide",
      )
      assertEqual(
        actionButtonInsertPayload(nextTemplate, [slides[0]!], "slide-1"),
        null,
        "Action payloads should not insert when no target slide exists",
      )
    },
  },
  {
    name: "action button handoff report summarizes PPTX action settings",
    run() {
      const deck = createDefaultDeck()
      const [firstSlide, secondSlide] = deck.slides

      assert(firstSlide && secondSlide, "Default deck should include two slides")

      const groupId = "action-next"
      const actionDeck = {
        ...deck,
        slides: [
          {
            ...firstSlide,
            elements: [
              ...firstSlide.elements,
              {
                ...createElement("shape"),
                groupId,
                id: "action-shape",
                linkSlideId: secondSlide.id,
              },
              {
                ...createElement("text"),
                content: "Next",
                groupId,
                id: "action-label",
                linkSlideId: secondSlide.id,
              },
              {
                ...createElement("shape"),
                id: "external-action",
                linkUrl: "example.com/path",
              },
              {
                ...createElement("shape"),
                id: "email-action",
                linkUrl: "mailto:team@example.com",
              },
              {
                ...createElement("shape"),
                id: "broken-action",
                linkSlideId: "missing-slide",
              },
            ],
          },
          secondSlide,
        ],
      }
      const cues = actionButtonHandoffCues(actionDeck)
      const actionPlan = pptxActionSettingPlan(actionDeck)
      const actionXmlAuthoring = pptxActionXmlAuthoring(actionDeck)
      const actionXmlText = serializePptxActionXmlAuthoring(actionDeck)
      const actionOverlayPart = actionXmlAuthoring.parts.find(
        (part) => part.kind === "slide-action-overlays",
      )
      const actionRelationshipPart = actionXmlAuthoring.parts.find(
        (part) => part.kind === "slide-action-relationships",
      )
      const officeReviewPlan = officeActionAnimationReviewPlan(actionDeck)
      const officeReviewText =
        serializeOfficeActionAnimationReviewPlan(officeReviewPlan)
      const report = deckActionButtonHandoffReport(actionDeck)
      const serialized = serializeActionButtonHandoffReport(actionDeck)
      const slideNotes = serializeSlideActionSettingNotes(actionDeck, actionDeck.slides[0]!)
      const preflight = pptxExportPreflight(actionDeck)
      const actionMetric = preflight.metrics.find(
        (metric) => metric.id === "action-links",
      )
      const nativeActionMetric = preflight.metrics.find(
        (metric) => metric.id === "native-action-settings",
      )

      assertEqual(cues.length, 4, "Grouped action buttons should be deduped")
      assertEqual(report.internalSlideCount, 1, "Handoff report should count internal slide actions")
      assertEqual(report.externalLinkCount, 2, "Handoff report should count external hyperlinks")
      assertEqual(report.nativeActionSettingCount, 3, "Handoff report should count native action settings")
      assertEqual(report.telephoneOrEmailCount, 1, "Handoff report should count mail and telephone links")
      assertEqual(report.groupedActionCount, 1, "Handoff report should count grouped action buttons once")
      assertEqual(report.warningCount, 1, "Handoff report should flag broken action targets")
      assertEqual(
        officeReviewPlan.nativeActionCatalogCount,
        3,
        "Office review planning should count safe native action catalog entries",
      )
      assertEqual(
        officeReviewPlan.blockedActionCount,
        1,
        "Office review planning should count exact blocked action objects",
      )
      assert(
        officeReviewPlan.actionItems.some(
          (item) =>
            item.elementId === "email-action" &&
            item.catalogKind === "email-hyperlink" &&
            item.officeMarkup.includes("mailto:team@example.com"),
        ),
        "Office review planning should classify email actions in the action catalog",
      )
      assert(
        officeReviewPlan.actionItems.some(
          (item) =>
            item.elementId === "broken-action" &&
            item.objectRef.includes("[broken-action]") &&
            item.ownerAction.includes("Relink"),
        ),
        "Office review planning should map blocked actions to exact slide objects",
      )
      assertEqual(
        actionPlan.items.find((item) => item.elementId === "action-shape")
          ?.relationshipTarget,
        "../slides/slide2.xml",
        "Action plans should preserve internal slide relationship targets",
      )
      assertEqual(
        actionPlan.items.find((item) => item.elementId === "email-action")
          ?.targetKind,
        "mailto",
        "Action plans should classify email links for Office action review",
      )
      assertEqual(
        actionXmlAuthoring.readyPartCount,
        2,
        "Action XML authoring should create overlay and relationship parts for the slide",
      )
      assertEqual(
        actionXmlAuthoring.nativeActionCount,
        3,
        "Action XML authoring should promote native action settings",
      )
      assertEqual(
        actionXmlAuthoring.internalRelationshipCount,
        1,
        "Action XML authoring should count internal slide relationships",
      )
      assertEqual(
        actionXmlAuthoring.externalRelationshipCount,
        2,
        "Action XML authoring should count external hyperlink relationships",
      )
      assert(
        Boolean(
          actionOverlayPart?.xml.includes('action="ppaction://hlinksldjump"') &&
            actionOverlayPart.xml.includes('r:id="rIdAction1"') &&
            actionOverlayPart.xml.includes("Next action overlay") &&
            actionRelationshipPart?.xml.includes('Target="../slides/slide2.xml"') &&
            actionRelationshipPart.xml.includes('TargetMode="External"') &&
            actionRelationshipPart.xml.includes("mailto:team@example.com"),
        ),
        "Action XML authoring should preserve click markup, relationship ids, slide targets, and external targets",
      )
      assert(
        serialized.includes("PowerPoint action-setting plan:"),
        "Serialized handoff should include the PowerPoint action plan",
      )
      assert(
        serialized.includes("Slide 2") &&
          serialized.includes("external-hyperlink") &&
          serialized.includes("blocked") &&
          serialized.includes("a:hlinkClick") &&
          serialized.includes("external-hyperlink:mailto:team@example.com"),
        "Serialized handoff should include slide, external, blocked, and Office relationship metadata",
      )
      assert(
        officeReviewText.includes("Office action and animation review plan") &&
          officeReviewText.includes("Office mail hyperlink") &&
          officeReviewText.includes("Missing slide target") &&
          officeReviewText.includes("[broken-action]"),
        "Serialized Office metadata review should expose action catalog and exact object ids",
      )
      assert(
        actionXmlText.includes("PowerPoint action XML authoring") &&
          actionXmlText.includes("ppt/slides/slide1.xml") &&
          actionXmlText.includes("ppt/slides/_rels/slide1.xml.rels"),
        "Serialized action XML authoring should include authored slide and relationship paths",
      )
      assert(
        slideNotes.includes("Essence action-setting handoff:") &&
          slideNotes.includes("relationship: internal-slide:../slides/slide2.xml"),
        "Slide notes should carry action-setting handoff metadata into PPTX export",
      )
      assertEqual(actionMetric?.value, "3/4", "PPTX preflight should count ready action settings")
      assertEqual(nativeActionMetric?.value, "3", "PPTX preflight should count native action-setting metadata")
      assert(
        preflight.metrics.some(
          (metric) => metric.id === "action-xml-parts" && metric.value === "2/2",
        ),
        "PPTX preflight should count authored action XML parts",
      )
      assert(
        preflight.metrics.some(
          (metric) => metric.id === "action-xml-links" && metric.value === "3",
        ),
        "PPTX preflight should count authored native action XML links",
      )
      assert(
        preflight.metrics.some(
          (metric) => metric.id === "office-action-catalog" && metric.value === "3",
        ),
        "PPTX preflight should count Office action catalog entries",
      )
      assert(
        preflight.metrics.some(
          (metric) => metric.id === "office-action-blockers" && metric.value === "1",
        ),
        "PPTX preflight should count exact action blockers",
      )
      assert(
        preflight.issues
          .find((issue) => issue.id === "action-links")
          ?.repairSteps?.some((step) => step.includes("[broken-action]")),
        "PPTX preflight should warn about broken action settings with exact object ids",
      )
    },
  },
  {
    name: "rich text toggles split and clear selection state",
    run() {
      const element = {
        ...createElement("text"),
        content: "Clear story",
        textRanges: [],
      }
      const boldRanges = toggleRichTextRange(
        element,
        { start: 0, end: 5 },
        { fontWeight: 700 },
        "bold-1",
      )
      const boldElement = { ...element, textRanges: boldRanges }

      assertEqual(
        richTextSelectionState(boldElement, { start: 0, end: 5 }).bold,
        true,
        "Selected text should report bold after toggle",
      )
      assertEqual(
        richTextSegments(boldElement, 0, 11)[0]?.style.fontWeight,
        700,
        "First rich-text segment should be bold",
      )
      assertEqual(
        toggleRichTextRange(
          boldElement,
          { start: 0, end: 5 },
          { fontWeight: 700 },
          "bold-2",
        ).length,
        0,
        "Toggling the same style should clear the range",
      )
    },
  },
  {
    name: "accessibility keyboard parity reports focus and shortcut coverage",
    run() {
      const deck = createDefaultDeck()
      const firstSlide = deck.slides[0]

      assert(firstSlide, "Default deck should include a first slide")

      const image = {
        ...createElement("image"),
        alt: "",
        assetId: "",
        src: "",
      }
      const text = {
        ...createElement("text"),
        background: "#ffffff",
        color: "#f8fafc",
        content: "Low contrast",
      }
      const problemDeck: Deck = {
        ...deck,
        slides: [
          {
            ...firstSlide,
            elements: [image, text],
          },
          ...deck.slides.slice(1),
        ],
      }
      const findings = scanDeckAccessibility(problemDeck)
      const report = accessibilityKeyboardParityReport({
        deck: problemDeck,
        findings,
      })
      const brokenReport = accessibilityKeyboardParityReport({
        focusSurfaces: [
          {
            hasAriaLabel: false,
            hasKeyboardEntry: false,
            hasVisibleFocus: false,
            id: "canvas",
            label: "Broken canvas",
            order: 1,
            role: "application",
          },
          {
            hasAriaLabel: true,
            hasKeyboardEntry: true,
            hasVisibleFocus: true,
            id: "filmstrip",
            label: "Broken filmstrip",
            order: 1,
            role: "navigation",
          },
        ],
        shortcuts: presentationKeyboardShortcuts.filter(
          (shortcut) => shortcut.surfaceId !== "canvas",
        ),
      })
      const serialized = serializeAccessibilityKeyboardParityReport(report)

      assertEqual(
        report.status,
        "ready",
        "Accessibility keyboard parity should pass for covered focus surfaces and shortcuts",
      )
      assert(
        report.shortcutCount >= 12,
        "Accessibility keyboard parity should include broad editor shortcut groups",
      )
      assert(
        report.accessibilityErrors >= 2,
        "Accessibility keyboard parity should retain deck accessibility scanner errors",
      )
      assert(
        report.checks.some(
          (check) =>
            check.id === "accessibility-diagnostics" &&
            check.status === "ready",
        ),
        "Accessibility keyboard parity should require actionable diagnostics",
      )
      assertEqual(
        brokenReport.status,
        "blocked",
        "Accessibility keyboard parity should block duplicate focus order, missing labels, and missing shortcuts",
      )
      assert(
        serialized.includes("Accessibility keyboard parity") &&
          serialized.includes("Shortcut groups"),
        "Accessibility keyboard parity should serialize a reviewable report",
      )
    },
  },
  {
    name: "comment mentions dedupe and unresolved counts stay stable",
    run() {
      assertArrayEqual(
        extractCommentMentions("Please ask @Ava, @ava and (@Dev-Ops) today"),
        ["ava", "dev-ops"],
        "Mentions should normalize and dedupe",
      )
      assertEqual(
        openMentionCount([
          {
            id: "comment-1",
            body: "",
            authorName: "Essence",
            targetElementId: "",
            mentions: ["ava", "dev"],
            resolved: false,
            createdAt: "",
            updatedAt: "",
          },
          {
            id: "comment-2",
            body: "",
            authorName: "Essence",
            targetElementId: "",
            mentions: ["done"],
            resolved: true,
            createdAt: "",
            updatedAt: "",
          },
        ]),
        2,
        "Resolved comment mentions should not count as open",
      )
    },
  },
  {
    name: "image asset creation deduplicates identical imports",
    run() {
      const deck = createDefaultDeck()
      const first = withImageAsset(deck, { src: tinyPngDataUrl, name: "tiny.png" })
      const second = withImageAsset(
        { ...deck, assets: first.assets },
        { src: tinyPngDataUrl, name: "tiny-copy.png" },
      )

      assertEqual(first.assets.length, 1, "First import should create an asset")
      assertEqual(second.assets.length, 1, "Second identical import should reuse the asset")
      assertEqual(first.assetId, second.assetId, "Duplicate imports should share the same asset id")
    },
  },
  {
    name: "deck asset migration moves inline image data into deck assets",
    run() {
      const deck = deckWithSingleElement({
        ...createElement("image"),
        src: tinyPngDataUrl,
        alt: "Tiny pixel",
      })
      const migrated = migrateDeckAssets(deck)
      const migratedImage = imageElement(migrated.slides[0]?.elements[0])

      assertEqual(migrated.assets.length, 1, "Migration should create one image asset")
      assert(migratedImage.assetId, "Migrated image should reference the asset")
      assertEqual(migratedImage.src, "", "Migrated image should not keep duplicate inline src")
    },
  },
  {
    name: "asset compaction rewires duplicate asset references",
    run() {
      const assetA: DeckAsset = {
        id: "asset-a",
        type: "image",
        name: "A",
        mimeType: "image/png",
        dataUrl: tinyPngDataUrl,
        storage: "inline",
        remoteUrl: "",
        sizeBytes: 10,
        createdAt: "",
      }
      const assetB: DeckAsset = {
        ...assetA,
        id: "asset-b",
        name: "B",
      }
      const deck = createDefaultDeck()
      const [firstSlide, ...restSlides] = deck.slides

      assert(firstSlide, "Default deck should include a first slide")

      const compacted = compactDeckAssets({
        ...deck,
        assets: [assetA, assetB],
        slides: [
          {
            ...firstSlide,
            elements: [
              { ...createElement("image"), assetId: "asset-a" },
              { ...createElement("image"), assetId: "asset-b" },
            ],
          },
          ...restSlides,
        ],
      })

      assertEqual(compacted.removedAssets, 1, "Duplicate asset should be removed")
      assertEqual(compacted.rewiredElements, 1, "Duplicate image element should be rewired")
      assertEqual(compacted.deck.assets.length, 1, "Compacted deck should keep one asset")
      assertEqual(
        compacted.deck.slides[0]?.elements[1]?.assetId,
        "asset-a",
        "Second image should now reference canonical asset",
      )
    },
  },
  {
    name: "history trimming keeps the newest undo entries",
    run() {
      const history = Array.from({ length: 35 }, (_, index) => ({
        ...createDefaultDeck(),
        title: `Deck ${index}`,
      }))
      const trimmed = trimDeckHistory(history)

      assertEqual(trimmed.length, 30, "Undo history should respect entry limit")
      assertEqual(trimmed[0]?.title, "Deck 5", "Oldest trimmed history entry should be removed")
      assertEqual(trimmed.at(-1)?.title, "Deck 34", "Newest history entry should be kept")
    },
  },
  {
    name: "local deck file status ignores save timestamps and tracks dirty edits",
    run() {
      const deck = createDefaultDeck()
      const exported = { version: 1, deck } as const
      const session = localDeckFileSessionFromExportedDeck({
        exportedDeck: exported,
        fileName: "board-review.json",
        now: new Date("2026-05-15T00:00:00.000Z"),
        writable: true,
      })

      assert(
        serializeExportedDeck(exported).includes('"version": 1'),
        "Deck JSON serialization should include the portable file version",
      )
      assertEqual(
        localDeckFileStatus({ current: exported, session }).kind,
        "clean",
        "Freshly saved local deck sessions should be clean",
      )
      assertEqual(
        exportedDeckSignature(exported),
        exportedDeckSignature({
          version: 1,
          deck: { ...deck, updatedAt: "2026-05-15T01:00:00.000Z" },
        }),
        "Local file signatures should ignore root updatedAt churn",
      )
      assertEqual(
        localDeckFileStatus({
          current: {
            version: 1,
            deck: { ...deck, title: "Board review revised" },
          },
          session,
        }).kind,
        "dirty",
        "Content edits should mark the local file session dirty",
      )
      assertEqual(
        localDeckFileStatus({
          current: exported,
          session: { ...session, writable: false },
        }).detail.includes("Save as deck file"),
        true,
        "Read-only fallback imports should guide users toward Save as deck file",
      )
    },
  },
  {
    name: "recent local deck management pins, searches, and separates stale files",
    run() {
      const now = new Date("2026-05-15T00:00:00.000Z")
      const recents: RecentLocalDeckFile[] = [
        {
          id: "stale-deck",
          lastModified: Date.parse("2026-04-01T00:00:00.000Z"),
          lastOpenedAt: Date.parse("2026-04-01T00:00:00.000Z"),
          name: "Stale deck.json",
          pinned: false,
          size: 1200,
        },
        {
          id: "fresh-deck",
          lastModified: Date.parse("2026-05-14T00:00:00.000Z"),
          lastOpenedAt: Date.parse("2026-05-14T00:00:00.000Z"),
          name: "Fresh deck.json",
          pinned: false,
          size: 2200,
        },
        {
          id: "pinned-old-deck",
          lastModified: Date.parse("2026-03-01T00:00:00.000Z"),
          lastOpenedAt: Date.parse("2026-03-01T00:00:00.000Z"),
          name: "Pinned old deck.json",
          pinned: true,
          size: 3200,
        },
      ]
      const grouped = organizeRecentLocalDeckFiles(recents, {
        now,
        query: "deck",
      })

      assertEqual(
        recentLocalDeckStaleCutoff(now),
        Date.parse("2026-04-15T00:00:00.000Z"),
        "Recent deck stale cutoff should use the configured 30-day window",
      )
      assertArrayEqual(
        sortRecentLocalDeckFiles(recents).map((recent) => recent.id),
        ["pinned-old-deck", "fresh-deck", "stale-deck"],
        "Pinned recent decks should sort before fresher unpinned decks",
      )
      assertArrayEqual(
        grouped.pinned.map((recent) => recent.id),
        ["pinned-old-deck"],
        "Pinned stale-looking deck handles should stay in the pinned group",
      )
      assertArrayEqual(
        grouped.recent.map((recent) => recent.id),
        ["fresh-deck"],
        "Fresh unpinned decks should stay reopenable in the recent group",
      )
      assertArrayEqual(
        grouped.stale.map((recent) => recent.id),
        ["stale-deck"],
        "Only unpinned old deck handles should be marked stale",
      )
      assertEqual(
        organizeRecentLocalDeckFiles(recents, { now, query: "fresh" })
          .hiddenMatches,
        2,
        "Search should report how many recent decks are hidden",
      )
    },
  },
  {
    name: "backstage document readiness summarizes file, cloud, assets, and export state",
    run() {
      const deck = createDefaultDeck()
      const exported = { version: 1, deck } as const
      const dirtyStatus = localDeckFileStatus({
        current: {
          version: 1,
          deck: { ...deck, title: "Changed readiness deck" },
        },
        session: localDeckFileSessionFromExportedDeck({
          exportedDeck: exported,
          fileName: "readiness.json",
          now: new Date("2026-05-15T00:00:00.000Z"),
          writable: true,
        }),
      })
      const report = fileBackstageReadinessReport({
        cloudDecks: [],
        cloudSignedIn: false,
        currentFileStatus: dirtyStatus,
        deck: {
          ...deck,
          assets: [
            {
              id: "unused-asset",
              createdAt: "2026-05-15T00:00:00.000Z",
              dataUrl: tinyPngDataUrl,
              mimeType: "image/png",
              name: "Unused.png",
              remoteUrl: "",
              sizeBytes: 1400,
              storage: "inline",
              type: "image",
            },
          ],
        },
        deckSizeBytes: 4096,
        imageSlideImportReport: null,
        openCommentCount: 0,
        pptxWarningReports: [],
        pptxWarnings: [
          {
            detail: "Animations are not preserved yet.",
            id: "animations-reset",
            label: "Animations not preserved",
            severity: "warning",
          },
        ],
        recoverySnapshots: [],
      })

      assertEqual(
        report.status,
        "attention",
        "Readiness should escalate when export blockers are present",
      )
      assertEqual(
        report.metrics.find((metric) => metric.id === "slides")?.value,
        "2",
        "Readiness metrics should include slide count",
      )
      assertEqual(
        report.checks.find((check) => check.id === "local-file")?.state,
        "warning",
        "Dirty local files should be visible in readiness checks",
      )
      assertEqual(
        report.checks.find((check) => check.id === "cloud-account")?.state,
        "attention",
        "Signed-out cloud state should block cloud readiness",
      )
      assertEqual(
        report.checks.find((check) => check.id === "compatibility")?.state,
        "attention",
        "Active PPTX warnings should block compatibility readiness",
      )
      assertEqual(
        report.checks.find((check) => check.id === "export")?.state,
        "attention",
        "Export readiness should reflect compatibility and asset blockers",
      )
    },
  },
  {
    name: "desktop bridge readiness summarizes local file capability",
    run() {
      const fallback = desktopBridgeReadinessFromCapabilities({})
      const browserLocal = desktopBridgeReadinessFromCapabilities({
        clipboard: true,
        fileOpen: true,
        fileSave: true,
        persistentHandles: true,
        recoveryStorage: true,
      })
      const shell = desktopBridgeReadinessFromCapabilities({
        clipboard: true,
        desktopShell: true,
        fileOpen: true,
        fileSave: true,
        persistentHandles: true,
        recoveryStorage: true,
      })

      assertEqual(
        fallback.variant,
        "fallback",
        "Missing browser APIs should use fallback local-file mode",
      )
      assertEqual(
        browserLocal.variant,
        "local",
        "Browser file APIs should mark local files ready",
      )
      assertEqual(
        shell.variant,
        "shell",
        "Desktop shell APIs should override browser-local readiness",
      )
      assertEqual(
        shell.readyCount,
        shell.totalCount,
        "Full desktop bridge readiness should mark every capability ready",
      )

      const fallbackMenu = desktopMenuContractFromReadiness(fallback, {
        canExportSelectedSlide: false,
      })
      const browserMenu = desktopMenuContractFromReadiness(browserLocal, {
        canExportSelectedSlide: true,
      })
      const shellMenu = desktopMenuContractFromReadiness(shell, {
        canExportSelectedSlide: true,
      })

      assertEqual(
        fallbackMenu.commands.find((command) => command.id === "file.open")
          ?.channel,
        "hidden-input",
        "File open should fall back to the upload input without picker support",
      )
      assertEqual(
        fallbackMenu.commands.find((command) => command.id === "file.exportSlidePng")
          ?.status,
        "blocked",
        "Selected-slide export should be blocked without a selected slide",
      )
      assertEqual(
        browserMenu.commands.find((command) => command.id === "file.open")
          ?.channel,
        "browser-picker",
        "Browser-local file commands should use picker channel",
      )
      assertEqual(
        browserMenu.commands.find((command) => command.id === "file.recoverySnapshots")
          ?.channel,
        "browser-storage",
        "Recovery commands should use storage channel outside the desktop shell",
      )
      assert(
        shellMenu.commands.every((command) => command.channel === "native-shell"),
        "Desktop shell command contract should be native-channel ready",
      )
      assertEqual(
        isDesktopMenuCommandId("file.saveAsJson"),
        true,
        "Known desktop menu command ids should validate",
      )
      assertEqual(
        isDesktopMenuCommandId("file.missing"),
        false,
        "Unknown desktop menu command ids should be rejected",
      )

      const shellPayloads = desktopFileCommandPayloadsFromReadiness(shell, {
        canExportSelectedSlide: true,
      })
      const pptxExportPayload = desktopFileCommandPayloadForCommand(
        "file.exportPptx",
        shell,
        { canExportSelectedSlide: true },
      )
      const blockedSlidePayload = desktopFileCommandPayloadForCommand(
        "file.exportSlidePng",
        fallback,
        { canExportSelectedSlide: false },
      )
      const now = Date.parse("2026-05-15T00:00:00.000Z")
      const recentFiles: RecentLocalDeckFile[] = [
        {
          id: "fresh",
          lastModified: now - 1_000,
          lastOpenedAt: now - 2 * 24 * 60 * 60 * 1000,
          name: "fresh.essdeck",
          nativePath: "C:\\Decks\\fresh.essdeck",
          pinned: false,
          size: 1200,
        },
        {
          id: "pinned-old",
          lastModified: now - 1_000,
          lastOpenedAt: now - 60 * 24 * 60 * 60 * 1000,
          name: "pinned.essdeck",
          nativePath: "C:\\Decks\\pinned.essdeck",
          pinned: true,
          size: 2400,
        },
        {
          id: "stale",
          lastModified: now - 1_000,
          lastOpenedAt: now - 45 * 24 * 60 * 60 * 1000,
          name: "stale.essdeck",
          nativePath: "C:\\Decks\\stale.essdeck",
          pinned: false,
          size: 3600,
        },
      ]
      const recentHandoff = desktopRecentFileHandoffSummary(recentFiles, {
        now,
        staleDays: 30,
      })
      const recentWriterPlan = desktopRecentDocumentWriterPlan(
        [
          ...recentFiles,
          {
            id: "legacy-json",
            lastModified: now - 1_000,
            lastOpenedAt: now - 24 * 60 * 60 * 1000,
            name: "legacy.json",
            nativePath: "C:\\Decks\\legacy.json",
            pinned: false,
            size: 900,
          },
        ],
        {
          now,
          staleDays: 30,
        },
      )
      const recentWriterText =
        serializeDesktopRecentDocumentWriterPlan(recentWriterPlan)
      const packagingReport = desktopPackagingReadinessReport(shell, {
        now,
        packaging: {
          appIdentifier: "app.essence.powerpoint",
          bundleTargets: ["all"],
          codeSigningIdentity: "Developer ID Application: Essence",
          notarizationProfile: "notarytool-profile",
          productName: "Essence PowerPoint",
          version: "0.1.0",
        },
        recentFiles,
        runtime: { canExportSelectedSlide: true },
        staleDays: 30,
      })
      const packagingReportText =
        serializeDesktopPackagingReadinessReport(packagingReport)
      const releaseRegistration = desktopReleaseRegistrationReport({
        fileAssociations: [...desktopReleaseFileAssociations],
        hasNativeRecentPathMetadata: true,
        hasNotarizationInputs: false,
        hasOsRecentDocumentWriter: true,
        hasSigningInputs: false,
        recentDocumentWriterCommandCount:
          packagingReport.recentDocuments.writerCommandCount,
        releaseGates: [...desktopReleaseGates],
      })
      const releaseRegistrationText =
        serializeDesktopReleaseRegistrationReport(releaseRegistration)

      assertEqual(
        shellPayloads.length,
        shellMenu.totalCount,
        "Desktop file command payloads should cover every desktop menu command",
      )
      assertEqual(
        pptxExportPayload?.permissionScope,
        "write-export-file",
        "PPTX export payload should request only export-write permission",
      )
      assertEqual(
        pptxExportPayload?.dialog.suggestedExtension,
        ".pptx",
        "PPTX export payload should carry a scoped save-file extension",
      )
      assertArrayEqual(
        desktopFileCommandPayloadForCommand("file.open", shell, {
          canExportSelectedSlide: true,
        })?.dialog.acceptExtensions ?? [],
        [...deckFileAcceptExtensions],
        "Deck open payload should accept app-owned deck files and legacy JSON decks",
      )
      assertEqual(
        desktopFileCommandPayloadForCommand("file.save", shell, {
          canExportSelectedSlide: true,
        })?.dialog.suggestedExtension,
        essenceDeckFileExtension,
        "Deck save payload should suggest the app-owned deck extension",
      )
      assertEqual(
        deckFileName("Board Review 2026"),
        "board-review-2026.essdeck",
        "Deck filenames should use the app-owned extension",
      )
      assertEqual(
        blockedSlidePayload?.status,
        "blocked",
        "Selected-slide payloads should preserve blocked command state",
      )
      assertEqual(
        recentHandoff.totalCount,
        3,
        "Recent file handoff should preserve every recent metadata row",
      )
      assertEqual(
        recentHandoff.nativeReadyCount,
        2,
        "Fresh and pinned recents should remain native recent-file candidates",
      )
      assertEqual(
        recentHandoff.staleCount,
        1,
        "Unpinned stale recents should require reopen before native handoff",
      )
      assertEqual(
        recentHandoff.items[0]?.permissionScope,
        "read-recent-handle",
        "Recent handoff items should be scoped to stored handle reads",
      )
      assertEqual(
        recentWriterPlan.writerCommandCount,
        2,
        "Only fresh or pinned app-owned deck paths should receive OS writer commands",
      )
      assertEqual(
        recentWriterPlan.legacyJsonCount,
        1,
        "Legacy JSON decks should remain openable without becoming OS recent-document registrations",
      )
      assertEqual(
        recentWriterPlan.items.find((item) => item.id === "fresh")?.command
          ?.request.permissionScope,
        "read-recent-handle",
        "OS recent-document writer commands should use the stored recent-handle scope",
      )
      assert(
        recentWriterText.includes("desktop_register_recent_document"),
        "Serialized OS recent-document plans should expose the native writer command",
      )
      assertEqual(
        packagingReport.fileAssociations.find(
          (association) => association.id === "essence-deck-file",
        )?.status,
        "ready",
        "Desktop packaging should plan Essence deck file associations from native open/save commands",
      )
      assertEqual(
        packagingReport.recentDocuments.osEligibleCount,
        2,
        "Only fresh or pinned native-path recents should be OS recent-document candidates",
      )
      assertEqual(
        packagingReport.recentDocuments.writerCommandCount,
        2,
        "Desktop packaging should surface scoped recent-document writer payload counts",
      )
      assertEqual(
        packagingReport.recentDocuments.status,
        "attention",
        "Stale recent files should keep desktop packaging in attention state",
      )
      assertEqual(
        packagingReport.signedPackageChecks.find(
          (check) => check.id === "code-signing",
        )?.status,
        "ready",
        "Configured signing metadata should satisfy the signing readiness check",
      )
      assertEqual(
        packagingReport.openSaveEdgeCases.find(
          (edgeCase) => edgeCase.id === "selected-slide-export-guard",
        )?.status,
        "ready",
        "Native open/save edge cases should cover selected-slide export blocking",
      )
      assert(
        packagingReportText.includes("Writer commands: 2"),
        "Serialized desktop packaging report should include OS recent-document writer metrics",
      )
      assert(
        packagingReportText.includes("Code signing identity"),
        "Serialized desktop packaging report should include signed-package readiness",
      )
      assertEqual(
        releaseRegistration.checks.find(
          (check) => check.id === "essence-deck-file-association",
        )?.status,
        "ready",
        "Release registration should recognize the Tauri Essence deck association",
      )
      assertEqual(
        releaseRegistration.checks.find(
          (check) => check.id === "legacy-json-not-claimed",
        )?.status,
        "ready",
        "Release registration should keep legacy JSON openable without claiming OS ownership",
      )
      assertEqual(
        releaseRegistration.checks.find(
          (check) => check.id === "essence-deck-type-metadata",
        )?.status,
        "ready",
        "Release registration should verify app-owned deck MIME metadata",
      )
      assert(
        desktopReleaseGates.some((gate) => gate.includes("Signed release packages")),
        "Desktop release profile should keep signing and notarization gates visible",
      )
      assertEqual(
        releaseRegistration.checks.find(
          (check) => check.id === "os-recent-document-writer",
        )?.status,
        "ready",
        "Release registration should recognize the native OS recent-document writer",
      )
      assert(
        releaseRegistrationText.includes("Desktop release registration"),
        "Serialized release registration report should be copyable for desktop release reviews",
      )
    },
  },
  {
    name: "native desktop file api scopes read and write invocations",
    async run() {
      const shell = desktopBridgeReadinessFromCapabilities({
        clipboard: true,
        desktopShell: true,
        fileOpen: true,
        fileSave: true,
        persistentHandles: true,
        recoveryStorage: true,
      })
      const openPayload = desktopFileCommandPayloadForCommand(
        "file.open",
        shell,
        { canExportSelectedSlide: true },
      )
      const savePayload = desktopFileCommandPayloadForCommand(
        "file.save",
        shell,
        { canExportSelectedSlide: true },
      )

      assert(openPayload, "Open payload should exist for native command tests")
      assert(savePayload, "Save payload should exist for native command tests")

      const calls: Array<{ command: string; args?: Record<string, unknown> }> =
        []
      const invoker = async <T,>(
        command: string,
        args?: Record<string, unknown>,
      ): Promise<T> => {
        calls.push({ command, args })

        if (command === "desktop_pick_and_read_file") {
          return {
            files: [
              {
                extension: "essdeck",
                lastModified: 1,
                mimeType: essenceDeckMimeType,
                name: "Quarterly.essdeck",
                path: "C:\\Decks\\Quarterly.essdeck",
                size: 2,
                text: "{}",
              },
            ],
            permissionScope: "read-deck-file",
            status: "picked",
          } as T
        }

        if (command === "desktop_register_recent_document") {
          return {
            fileName: "Quarterly.essdeck",
            path: "C:\\Decks\\Quarterly.essdeck",
            permissionScope: "read-recent-handle",
            platform: "windows-shell",
            status: "registered",
          } as T
        }

        return {
          bytesWritten: 2,
          extension: "essdeck",
          fileName: "Quarterly.essdeck",
          path: "C:\\Decks\\Quarterly.essdeck",
          permissionScope: "write-deck-file",
          status: "saved",
        } as T
      }

      const readResponse = await readNativeDesktopFiles(openPayload, {
        invoker,
        path: "C:\\Decks\\Quarterly.essdeck",
      })
      const writeResponse = await writeNativeDesktopFile(
        savePayload,
        {
          path: "C:\\Decks\\Quarterly.essdeck",
          suggestedName: "Quarterly.essdeck",
          text: "{}",
        },
        { invoker },
      )
      const recentResponse = await registerNativeDesktopRecentDocument(
        { path: "C:\\Decks\\Quarterly.essdeck" },
        { invoker },
      )
      const readRequest = calls[0]?.args?.request as {
        dialog?: { permissionScope?: string }
        path?: string
      }
      const writeRequest = calls[1]?.args?.request as {
        dialog?: { permissionScope?: string; suggestedName?: string }
        path?: string
        text?: string
      }
      const recentRequest = calls[2]?.args?.request as {
        path?: string
        permissionScope?: string
      }

      assertEqual(
        desktopFileDialogRequest(openPayload).permissionScope,
        "read-deck-file",
        "Native dialog requests should preserve scoped read permissions",
      )
      assertEqual(
        calls[0]?.command,
        "desktop_pick_and_read_file",
        "Native read bridge should call the Rust read command",
      )
      assertEqual(
        readRequest.dialog?.permissionScope,
        "read-deck-file",
        "Native read command should carry the existing file-read scope",
      )
      assertEqual(
        readRequest.path,
        "C:\\Decks\\Quarterly.essdeck",
        "Native recent reads should pass the scoped recent path",
      )
      assertEqual(
        readResponse.files[0]?.text,
        "{}",
        "Native text reads should return text payloads for deck files",
      )
      assertEqual(
        calls[1]?.command,
        "desktop_save_file",
        "Native write bridge should call the Rust save command",
      )
      assertEqual(
        writeRequest.dialog?.permissionScope,
        "write-deck-file",
        "Native save command should carry the existing file-write scope",
      )
      assertEqual(
        writeRequest.dialog?.suggestedName,
        "Quarterly.essdeck",
        "Native save command should preserve the user-facing suggested filename",
      )
      assertEqual(
        writeRequest.text,
        "{}",
        "Native save command should write the serialized deck text",
      )
      assertEqual(
        writeResponse.status,
        "saved",
        "Native write response should report a saved status",
      )
      assertEqual(
        calls[2]?.command,
        "desktop_register_recent_document",
        "Native recent bridge should call the Rust recent-document command",
      )
      assertEqual(
        recentRequest.permissionScope,
        "read-recent-handle",
        "Native recent registration should reuse the stored recent-handle scope",
      )
      assertEqual(
        recentRequest.path,
        "C:\\Decks\\Quarterly.essdeck",
        "Native recent registration should pass the native deck path",
      )
      assertEqual(
        recentResponse.status,
        "registered",
        "Native recent registration should report a registered status",
      )
    },
  },
  {
    name: "pptx compatibility warnings summarize unsupported imported features",
    run() {
      const warnings = pptxCompatibilityWarningsFromEntries({
        "ppt/activeX/control1.xml": utf8("<control />"),
        "ppt/commentAuthors.xml": utf8("<authors />"),
        "ppt/diagrams/data1.xml": utf8("<diagram />"),
        "ppt/embeddings/oleObject1.bin": new Uint8Array([1]),
        "ppt/media/audio1.mp3": new Uint8Array([1]),
        "ppt/media/image1.png": new Uint8Array([1]),
        "ppt/media/movie1.flac": new Uint8Array([1]),
        "ppt/slides/slide1.xml": utf8("<sld><transition /><timing /></sld>"),
        "ppt/vbaProject.bin": new Uint8Array([1]),
      })
      const ids = warnings.map((warning) => warning.id)

      assertArrayEqual(
        ids,
        [
          "transitions-reset",
          "animations-reset",
          "media-skipped",
          "embedded-objects",
          "activex-controls",
          "smartart-skipped",
          "comments-skipped",
          "macros-skipped",
        ],
        "PPTX compatibility warnings should stay deterministic",
      )
      assert(
        warnings.some((warning) =>
          warning.detail.includes("supported inline MP4/M4V/MOV/MP3/M4A/AAC/WAV"),
        ),
        "Compatibility reports should explain that supported PPTX media imports natively",
      )
      assert(
        pptxCompatibilityWarningMessage(warnings, 2).includes(
          "6 more compatibility warnings",
        ),
        "Compatibility warning messages should summarize overflow items",
      )
    },
  },
  {
    name: "pptx transition metadata imports basic timing and type",
    run() {
      const fade = pptxSlideTransitionFromXml(
        `<p:sld xmlns:p="${presentationNamespace}"><p:transition spd="slow" advTm="8000"><p:fade /></p:transition></p:sld>`,
      )
      const push = pptxSlideTransitionFromXml(
        `<p:sld xmlns:p="${presentationNamespace}"><p:transition dur="450"><p:push /></p:transition></p:sld>`,
      )
      const unknown = pptxSlideTransitionFromXml(
        `<p:sld xmlns:p="${presentationNamespace}"><p:transition><p:randomBar /></p:transition></p:sld>`,
      )
      const timedCut = pptxSlideTransitionFromXml(
        `<p:sld xmlns:p="${presentationNamespace}"><p:transition advTm="6500" /></p:sld>`,
      )

      assertEqual(
        fade.transition,
        "fade",
        "PPTX fade transitions should import as fade",
      )
      assertEqual(
        fade.transitionDurationMs,
        1000,
        "PPTX slow transition speed should map to a longer duration",
      )
      assertEqual(
        fade.autoAdvanceAfterMs,
        8000,
        "PPTX auto-advance timing should import when present",
      )
      assertEqual(
        push.transitionDurationMs,
        450,
        "PPTX explicit transition durations should be preserved",
      )
      assertEqual(
        timedCut.transition,
        "none",
        "PPTX timing-only transitions should import without adding a visual effect",
      )
      assertEqual(
        timedCut.autoAdvanceAfterMs,
        6500,
        "PPTX timing-only transitions should preserve auto advance",
      )
      assertEqual(
        unknown.transition,
        "fade",
        "Unsupported PPTX transition types should simplify to fade",
      )
    },
  },
  {
    name: "pptx comments import basic text author and mentions",
    run() {
      const authors = pptxCommentAuthorsFromXml(
        `<p:cmAuthorLst xmlns:p="${presentationNamespace}"><p:cmAuthor id="4" name="Amina Reviewer" initials="AR" /><p:cmAuthor id="5" name="Mira Reviewer" initials="MR" /></p:cmAuthorLst>`,
      )
      const comments = pptxSlideCommentsFromXml(
        `<p:cmLst xmlns:p="${presentationNamespace}"><p:cm authorId="4" dt="2026-05-15T08:30:00Z"><p:pos x="10" y="20" /><p:text>Check the launch slide with @design</p:text></p:cm></p:cmLst>`,
        authors,
      )
      const threadedComments = pptxSlideCommentsFromXml(
        `<p:threadedComments xmlns:p="${presentationNamespace}"><p:threadedComment userId="4" id="thread-7" created="2026-05-15T09:00:00Z"><p:text>Thread root</p:text></p:threadedComment><p:threadedComment userId="5" id="reply-8" parentId="thread-7" created="2026-05-15T09:05:00Z"><p:text>Thread reply</p:text></p:threadedComment></p:threadedComments>`,
        authors,
      )

      assertEqual(
        comments.length,
        1,
        "PPTX legacy comments should become slide comments",
      )
      assertEqual(
        comments[0]?.authorName,
        "Amina Reviewer",
        "PPTX comment authors should be preserved when available",
      )
      assertEqual(
        comments[0]?.createdAt,
        "2026-05-15T08:30:00.000Z",
        "PPTX comment timestamps should import as ISO strings",
      )
      assertArrayEqual(
        comments[0]?.mentions ?? [],
        ["design"],
        "PPTX comment mentions should use existing mention parsing",
      )
      assertEqual(
        comments[0]?.sourceAnchor?.x,
        10,
        "PPTX comment anchors should preserve x coordinates",
      )
      assertEqual(
        threadedComments[0]?.sourceThreadId,
        "thread-7",
        "PPTX threaded comments should preserve thread identifiers",
      )
      assertEqual(
        threadedComments[1]?.sourceParentCommentId,
        "thread-7",
        "PPTX threaded comments should preserve parent identifiers",
      )
      assertEqual(
        threadedComments[1]?.sourceReplyDepth,
        1,
        "PPTX threaded comments should preserve reply depth",
      )
      assertEqual(
        threadedComments[1]?.sourceReplyToAuthorName,
        "Amina Reviewer",
        "PPTX threaded comments should preserve reply author context",
      )
      assertEqual(
        threadedComments[1]?.sourceThreadId,
        "thread-7",
        "PPTX threaded replies should stay attached to the root thread",
      )
    },
  },
  {
    name: "pptx compatibility reports persist only valid warning reviews",
    run() {
      const deck = createDefaultDeck()
      const warnings = pptxCompatibilityWarningsFromEntries({
        "ppt/slides/slide1.xml": utf8(
          `<p:sld xmlns:p="${presentationNamespace}"><p:transition /></p:sld>`,
        ),
        "ppt/media/audio1.flac": new Uint8Array(),
      })
      const report = pptxCompatibilityReportFromWarnings(
        {
          deck,
          sourceFileName: "board-review.pptx",
          warnings,
        },
        new Date("2026-05-15T01:00:00.000Z"),
      )

      assert(report, "Warnings should create a compatibility report")
      assertEqual(
        report.sourceFileName,
        "board-review.pptx",
        "Compatibility reports should keep the source filename",
      )
      assert(
        serializePptxCompatibilityReportText(report).includes(
          "Transitions simplified",
        ),
        "Compatibility report text should include warning labels",
      )
      assertEqual(
        pptxCompatibilityReportFileName(report),
        "board-review-compatibility.txt",
        "Compatibility report downloads should use safe filenames",
      )

      const parsed = parsePptxCompatibilityReport({
        ...report,
        warnings: [
          ...report.warnings,
          {
            detail: "Unsupported warning should be ignored",
            id: "unknown-warning",
            label: "Unknown",
            severity: "warning",
          },
        ],
      })

      assert(parsed, "Stored compatibility reports should parse back")
      assertEqual(
        parsed.warnings.length,
        report.warnings.length,
        "Invalid persisted warnings should be dropped from report history",
      )
      assertEqual(
        pptxCompatibilityReportFromWarnings({
          deck,
          sourceFileName: "clean.pptx",
          warnings: [],
        }),
        null,
        "Clean imports should clear stale compatibility reports",
      )
    },
  },
  {
    name: "pptx compatibility report archives keep recent import history",
    run() {
      const deck = createDefaultDeck()
      const warnings = pptxCompatibilityWarningsFromEntries({
        "ppt/slides/slide1.xml": utf8(
          `<p:sld xmlns:p="${presentationNamespace}"><p:timing /></p:sld>`,
        ),
      })
      const firstReport = pptxCompatibilityReportFromWarnings(
        {
          deck,
          sourceFileName: "kickoff.pptx",
          warnings,
        },
        new Date("2026-05-15T01:00:00.000Z"),
      )
      const secondReport = pptxCompatibilityReportFromWarnings(
        {
          deck: { ...deck, id: "deck-quarterly-review" },
          sourceFileName: "quarterly-review.pptx",
          warnings,
        },
        new Date("2026-05-15T02:00:00.000Z"),
      )

      assert(firstReport, "First compatibility report should be created")
      assert(secondReport, "Second compatibility report should be created")

      const archive = parsePptxCompatibilityReportArchive({
        activeReportId: firstReport.id,
        reports: [firstReport, secondReport],
        version: 1,
      })

      assertEqual(
        archive.reports[0]?.id,
        secondReport.id,
        "Compatibility archives should sort newest imports first",
      )
      assertEqual(
        activePptxCompatibilityReport(archive)?.id,
        firstReport.id,
        "Compatibility archives should preserve the active report selection",
      )
      assertEqual(
        parsePptxCompatibilityReportArchive(secondReport).activeReportId,
        secondReport.id,
        "Legacy single-report storage should migrate into an archive",
      )
    },
  },
  {
    name: "local recovery snapshots dedupe unchanged deck states",
    run() {
      const deck = createDefaultDeck()
      const exported = { version: 1, deck } as const
      const firstSnapshot = localDeckRecoverySnapshotFromExportedDeck(
        exported,
        new Date("2026-05-15T00:00:00.000Z"),
      )
      const unchanged = rememberLocalDeckRecoverySnapshotInList(
        [firstSnapshot],
        exported,
        new Date("2026-05-15T00:01:00.000Z"),
      )
      const changed = rememberLocalDeckRecoverySnapshotInList(
        unchanged,
        {
          version: 1,
          deck: { ...deck, title: "Recovered board review" },
        },
        new Date("2026-05-15T00:02:00.000Z"),
      )

      assertEqual(
        unchanged.length,
        1,
        "Recovery snapshots should dedupe unchanged deck signatures",
      )
      assertEqual(
        changed.length,
        2,
        "Recovery snapshots should keep new content states",
      )
      assertEqual(
        changed[0]?.title,
        "Recovered board review",
        "Newest recovery snapshots should be first",
      )
    },
  },
  {
    name: "local recovery snapshots can prune one deck without losing older decks",
    run() {
      const deck = createDefaultDeck()
      const firstDeckExport = { version: 1, deck } as const
      const secondDeckExport = {
        version: 1,
        deck: {
          ...deck,
          id: "deck-older-board-review",
          title: "Older board review",
        },
      } as const
      const firstDeckSnapshot = localDeckRecoverySnapshotFromExportedDeck(
        firstDeckExport,
        new Date("2026-05-15T00:00:00.000Z"),
      )
      const secondDeckSnapshot = localDeckRecoverySnapshotFromExportedDeck(
        secondDeckExport,
        new Date("2026-05-15T00:01:00.000Z"),
      )
      const pruned = forgetLocalDeckRecoverySnapshotsForDeckInList(
        [firstDeckSnapshot, secondDeckSnapshot],
        deck.id,
      )

      assertEqual(
        pruned.length,
        1,
        "Deck-scoped recovery pruning should only remove matching snapshots",
      )
      assertEqual(
        pruned[0]?.deckId,
        secondDeckExport.deck.id,
        "Older deck snapshots should remain available after current-deck cleanup",
      )
    },
  },
  {
    name: "local recovery restores keep rollback checkpoints",
    run() {
      const currentDeck = {
        ...createDefaultDeck(),
        title: "Unsaved current deck",
      }
      const restoredDeck = {
        ...createDefaultDeck(),
        title: "Selected recovery deck",
      }
      const currentExport = { version: 1, deck: currentDeck } as const
      const restoredSnapshot = localDeckRecoverySnapshotFromExportedDeck(
        { version: 1, deck: restoredDeck },
        new Date("2026-05-15T04:00:00.000Z"),
      )
      const result = rememberLocalDeckRecoveryRestoreCheckpointInList(
        [restoredSnapshot],
        currentExport,
        restoredSnapshot,
        new Date("2026-05-15T04:05:00.000Z"),
      )
      const unchanged = rememberLocalDeckRecoveryRestoreCheckpointInList(
        [restoredSnapshot],
        restoredSnapshot.exportedDeck,
        restoredSnapshot,
        new Date("2026-05-15T04:06:00.000Z"),
      )

      assertEqual(
        result.checkpointCreated,
        true,
        "Restoring a different recovery snapshot should preserve the current deck first",
      )
      assertEqual(
        result.snapshots[0]?.title,
        "Unsaved current deck",
        "Restore checkpoints should make the current deck the newest recovery entry",
      )
      assertEqual(
        result.snapshots[1]?.id,
        restoredSnapshot.id,
        "The selected recovery snapshot should remain available after checkpointing",
      )
      assertEqual(
        unchanged.checkpointCreated,
        false,
        "Restoring an identical snapshot should not create a duplicate checkpoint",
      )
    },
  },
  {
    name: "local recovery reviews compare snapshots before restore",
    run() {
      const currentDeck = createDefaultDeck()
      const snapshotDeck = {
        ...currentDeck,
        title: "Recovered launch review",
        slides: [
          ...currentDeck.slides,
          createOutlineSlide(3, {
            body: "Recovered note",
            title: "Recovered slide",
          }),
        ],
      }
      const snapshot = localDeckRecoverySnapshotFromExportedDeck(
        { version: 1, deck: snapshotDeck },
        new Date("2026-05-15T03:00:00.000Z"),
      )
      const review = localDeckRecoveryReview(currentDeck, snapshot)
      const sameContentReview = localDeckRecoveryReview(
        currentDeck,
        localDeckRecoverySnapshotFromExportedDeck(
          { version: 1, deck: currentDeck },
          new Date("2026-05-15T03:01:00.000Z"),
        ),
      )
      const olderDeckReview = localDeckRecoveryReview(currentDeck, {
        ...snapshot,
        deckId: "older-deck",
        exportedDeck: {
          version: 1,
          deck: { ...snapshotDeck, id: "older-deck" },
        },
      })

      assertEqual(
        review.recommendation,
        "current-deck",
        "Snapshots from the current deck should be marked as same-deck recovery candidates",
      )
      assertEqual(
        review.slideDelta,
        1,
        "Recovery reviews should show slide count differences",
      )
      assertEqual(
        review.slideDeltas.at(-1)?.status,
        "added",
        "Recovery reviews should identify added snapshot slides",
      )
      assertEqual(
        review.slideDeltas.at(-1)?.snapshotElementCount,
        2,
        "Recovery reviews should compare slide object counts",
      )
      assertEqual(
        sameContentReview.recommendation,
        "same-content",
        "Unchanged snapshots should be marked as current content",
      )
      assertEqual(
        olderDeckReview.recommendation,
        "older-deck",
        "Snapshots from older decks should be identified before restore",
      )
      assert(
        serializeLocalDeckRecoveryReviewText(review).includes(
          "Recovered launch review",
        ),
        "Recovery review text should include the snapshot title",
      )
      assertEqual(
        localDeckRecoverySnapshotFileName(snapshot),
        "recovered-launch-review-2026-05-15-recovery.json",
        "Recovery snapshot downloads should use safe JSON filenames",
      )
      assert(
        serializeLocalDeckRecoverySnapshotJson(snapshot).includes(
          '"version": 1',
        ),
        "Recovery snapshot downloads should contain portable deck JSON",
      )
    },
  },
  {
    name: "deck scale metrics flag large and heavy editor workloads",
    run() {
      const defaultMetrics = deckScaleMetrics(createDefaultDeck())
      assertEqual(defaultMetrics.rating, "ready", "Default deck should stay in ready range")
      assertEqual(defaultMetrics.animatedElements, 0, "Default decks should start without animation load")
      assertEqual(deckScaleLabel(defaultMetrics.rating), "Deck ready", "Ready decks should get a clear label")

      const largeDeck = {
        ...createDefaultDeck(),
        slides: Array.from({ length: 70 }, (_, slideIndex) => ({
          ...createOutlineSlide(slideIndex + 1, {
            body: "One\nTwo\nThree",
            title: `Slide ${slideIndex + 1}`,
          }),
          elements: Array.from({ length: 14 }, (_, elementIndex) => ({
            ...createElement("text"),
            id: `slide-${slideIndex}-element-${elementIndex}`,
          })),
        })),
      }
      const largeMetrics = deckScaleMetrics(largeDeck)
      assertEqual(largeMetrics.rating, "large", "Large stress deck should be flagged")
      assertEqual(largeMetrics.elements, 980, "Large deck object counts should be exact")

      const heavyDeck = {
        ...createDefaultDeck(),
        slides: [
          {
            ...createOutlineSlide(1, { body: "", title: "Heavy slide" }),
            elements: Array.from({ length: 145 }, (_, index) => ({
              ...createElement("shape"),
              id: `shape-${index}`,
            })),
          },
        ],
      }
      assertEqual(
        deckScaleMetrics(heavyDeck).rating,
        "heavy",
        "Single-slide object overloads should be flagged as heavy",
      )

      const animationHeavyDeck = {
        ...createDefaultDeck(),
        slides: [
          {
            ...createOutlineSlide(1, {
              body: "",
              title: "Animation-heavy slide",
            }),
            elements: Array.from({ length: 41 }, (_, index) => ({
              ...createElement("shape"),
              animation: index % 2 ? ("growShrink" as const) : ("flyLeft" as const),
              id: `animated-shape-${index}`,
            })),
          },
        ],
      }
      const animationHeavyMetrics = deckScaleMetrics(animationHeavyDeck)
      assertEqual(animationHeavyMetrics.animatedElements, 41, "Animated object counts should be exact")
      assertEqual(animationHeavyMetrics.maxAnimatedElementsOnSlide, 41, "Busiest slide animation counts should be exact")
      assertEqual(
        animationHeavyMetrics.rating,
        "heavy",
        "Single-slide animation overloads should be flagged as heavy",
      )
      assertEqual(
        deckScaleLimits.heavy.maxAnimatedElementsOnSlide,
        40,
        "Production diagnostics should share the deck-scale animation limit",
      )

      const pressure = presentationPerformancePressureReport(
        animationHeavyDeck,
        Array.from({ length: 31 }, () => createDefaultDeck()),
      )
      assertEqual(
        pressure.status,
        "attention",
        "Production pressure should escalate heavy animation and undo history load",
      )
      assertEqual(
        pressure.diagnostics.find((item) => item.id === "busiest-animation-slide")
          ?.status,
        "attention",
        "Pressure diagnostics should identify the busiest animation slide",
      )
      assertEqual(
        pressure.diagnostics.find((item) => item.id === "undo-entries")?.status,
        "attention",
        "Pressure diagnostics should flag undo histories beyond the capped entry count",
      )
    },
  },
  {
    name: "canvas render budget preserves selected text checks on dense slides",
    run() {
      const slide = {
        ...createOutlineSlide(1, { body: "", title: "Dense slide" }),
        elements: Array.from({ length: 150 }, (_, index) => ({
          ...createElement("text"),
          id: `text-${index}`,
        })),
      }

      const budget = canvasRenderBudget(slide, ["text-149"])
      const containmentStyle = canvasElementContainmentStyle(budget)

      assertEqual(budget.density, "budgeted", "Very dense slides should use the budgeted mode")
      assertEqual(
        shouldCheckTextOverflow(budget, "text-0"),
        true,
        "Early text objects should keep overflow checks",
      )
      assertEqual(
        shouldCheckTextOverflow(budget, "text-149"),
        true,
        "Selected text objects should keep overflow checks outside the budget window",
      )
      assertEqual(
        shouldCheckTextOverflow(budget, "text-100"),
        false,
        "Unselected overflow work should be reduced on very dense slides",
      )
      assertEqual(
        containmentStyle.contentVisibility,
        "auto",
        "Dense canvas elements should opt into browser render containment",
      )
    },
  },
  {
    name: "large deck windowing safeguards bound slide and canvas pressure",
    run() {
      const selectedSlideId = "large-slide-200"
      const denseElements = Array.from({ length: 150 }, (_, index) => ({
        ...createElement("text"),
        animation: index < 60 ? ("pulse" as const) : ("none" as const),
        id: `dense-text-${index}`,
      }))
      const deck = {
        ...createDefaultDeck(),
        slides: Array.from({ length: 260 }, (_, index) => ({
          ...createOutlineSlide(index + 1, {
            body: "",
            title: `Large deck slide ${index + 1}`,
          }),
          elements: index === 200 ? denseElements : [],
          id: `large-slide-${index}`,
        })),
      }

      const anchorWindow = slideAnchorWindowPlan(deck, { selectedSlideId })
      const filmstripWindow = virtualFilmstripWindow({
        rowCount: deck.slides.length,
        rowHeight: largeDeckWindowLimits.filmstripRowHeight,
        scrollTop: largeDeckWindowLimits.filmstripRowHeight * 200,
        viewportHeight: 360,
      })
      const safeguards = largeDeckSafeguardReport(deck, {
        selectedElementIds: ["dense-text-149"],
        selectedSlideId,
      })
      const pressure = presentationPerformancePressureReport(deck)

      assertEqual(
        anchorWindow.mode,
        "windowed",
        "Large decks should use an active slide neighborhood window",
      )
      assert(
        anchorWindow.renderedSlideIds.includes(selectedSlideId),
        "The selected slide must stay inside the active slide window",
      )
      assert(
        anchorWindow.renderedSlideIds.length <=
          largeDeckWindowLimits.maxAnchorWindowSlides,
        "The active slide window should stay within the configured cap",
      )
      assert(
        anchorWindow.deferredSlideCount > 0,
        "Large decks should defer slides outside the active neighborhood",
      )
      assertEqual(
        filmstripWindow.startIndex,
        195,
        "Virtual filmstrip windows should include overscan before the viewport",
      )
      assertEqual(
        filmstripWindow.endIndexExclusive,
        209,
        "Virtual filmstrip windows should cap rendered rows to viewport plus overscan",
      )
      assertEqual(
        safeguards.canvasDetail.budget.density,
        "budgeted",
        "The active dense slide should opt into the budgeted canvas mode",
      )
      assert(
        safeguards.canvasDetail.deferredTextOverflowCheckCount > 0,
        "Dense slide safeguards should defer unselected overflow checks",
      )
      assertEqual(
        safeguards.slideWindow.range.visibleCount,
        largeDeckWindowLimits.maxAnchorWindowSlides,
        "The large-deck report should expose the bounded active window",
      )
      assertEqual(
        safeguards.status,
        "attention",
        "The combined safeguard report should escalate a budgeted active slide",
      )
      assert(
        pressure.diagnostics.some(
          (diagnostic) => diagnostic.id === "large-deck-slide-window",
        ),
        "Production pressure diagnostics should include the slide-window safeguard",
      )
      assertEqual(
        pressure.diagnostics.find(
          (diagnostic) => diagnostic.id === "large-deck-canvas-detail",
        )?.status,
        "ready",
        "Deck-wide production pressure should inspect the default active slide without a selected slide override",
      )
    },
  },
  {
    name: "multi-series chart data edits round-trip and feed native PPTX export",
    run() {
      const chart = {
        ...createElement("chart"),
        chartSeries: chartSeriesFromTsv(
          [
            "Category\tRevenue\tMargin",
            "Color\t#2563eb\t#16a34a",
            "Q1\t42\t18",
            "Q2\t64\t24",
          ].join("\n"),
        ),
      } satisfies PresentationElement
      const series = chartSeries(chart)

      assertEqual(series.length, 2, "Chart series TSV should create two series")
      assertEqual(series[0]?.name, "Revenue", "First series name should come from the header row")
      assertEqual(series[1]?.data[1]?.value, 24, "Second series should preserve category values")
      assertEqual(
        chartDataFromSeries(series)[1]?.value,
        64,
        "Legacy chart data should mirror the first edited series",
      )
      assert(
        hasMultiSeriesChart(chart),
        "Cartesian charts with multiple series should be classified as multi-series",
      )
      assert(
        chartSeriesToTsv(chart).includes("Category\tRevenue\tMargin"),
        "Series TSV should preserve editable headers",
      )
      assert(
        chartText(chart).includes("Margin - Q2: 24"),
        "Chart text summaries should include series and category labels",
      )
      assertEqual(
        pptxChartDataSeries(chart).length,
        2,
        "Native PPTX chart export should receive multiple data series",
      )
      assertEqual(
        pptxChartDataSeries(chart)[1]?.values[1],
        24,
        "Native PPTX chart series values should stay category-aligned",
      )
    },
  },
  {
    name: "custom design palettes derive reusable colors from the current deck",
    run() {
      const deck = createDefaultDeck()
      const firstSlide = deck.slides[0]
      assert(firstSlide, "Default deck should include a first slide")

      const palette = designPaletteFromDeck(
        {
          ...deck,
          master: { ...deck.master, color: "#64748b" },
          slides: [
            {
              ...firstSlide,
              background: "#101827",
              elements: [
                {
                  ...createElement("title"),
                  id: "title-1",
                  color: "#f8fafc",
                },
                {
                  ...createElement("shape"),
                  id: "shape-1",
                  background: "#38bdf8",
                  shapeStrokeColor: "#0ea5e9",
                },
                {
                  ...createElement("chart"),
                  id: "chart-1",
                  chartData: [
                    { color: "#f97316", label: "A", value: 10 },
                    { color: "#22c55e", label: "B", value: 20 },
                  ],
                },
              ],
            },
            ...deck.slides.slice(1),
          ],
        },
        firstSlide.id,
        "  Launch palette  ",
        new Date("2026-05-15T00:00:00.000Z"),
      )

      assert(palette.id.startsWith("custom:"), "Saved palette ids should be custom scoped")
      assertEqual(palette.label, "Launch palette", "Palette names should be trimmed")
      assertEqual(palette.background, "#101827", "Slide background should be captured")
      assertEqual(palette.text, "#f8fafc", "Text color should be captured")
      assertEqual(palette.accent, "#0ea5e9", "Shape stroke should become the accent")
      assertArrayEqual(
        palette.chartColors,
        ["#0ea5e9", "#38bdf8", "#f97316", "#22c55e"],
        "Chart colors should preserve deck-specific accents first",
      )
      const parsed = parseCustomDesignPalettesText(
        serializeCustomDesignPalettes([palette]),
      )
      assertEqual(
        parsed[0]?.label,
        "Launch palette",
        "Palette export JSON should round-trip saved palettes",
      )
      assertEqual(
        parseCustomDesignPalettesText(JSON.stringify([palette]))[0]?.id,
        palette.id,
        "Legacy palette arrays should remain importable",
      )
      assertEqual(
        parseCustomDesignPalettesText("not json").length,
        0,
        "Invalid palette files should fail closed",
      )
      const olderPalette = {
        ...palette,
        id: "custom:older-palette",
        label: "Older palette",
        createdAt: "2026-05-14T00:00:00.000Z",
      } as const
      assertArrayEqual(
        recommendedCustomDesignPalettes([olderPalette, palette], { limit: 1 }).map(
          (item) => item.id,
        ),
        [palette.id],
        "Custom palette recommendations should prefer recently saved palettes",
      )
    },
  },
  {
    name: "template theme variants preview and create themed decks",
    run() {
      const originalPreview = templatePreviewDeck("pitch", "original")
      const graphitePreview = templatePreviewDeck("pitch", "graphite")
      const themedDeck = createDeckFromTemplateVariant("pitch", "graphite")

      assertEqual(
        originalPreview.slides[0]?.background,
        "#eff6ff",
        "Original template previews should preserve template styling",
      )
      assertEqual(
        graphitePreview.slides[0]?.background,
        "#111827",
        "Theme preview variants should recolor the first slide",
      )
      assertEqual(
        graphitePreview.slides[1]?.background,
        "#111827",
        "Theme preview variants should apply across the preview deck",
      )
      assertEqual(
        graphitePreview.slides[0]?.elements[0]?.color,
        "#f8fafc",
        "Theme preview variants should update title contrast",
      )
      assertEqual(
        themedDeck.master.color,
        "#cbd5e1",
        "Themed template creation should update deck master color",
      )
      assertEqual(
        themedDeck.master.fontFamily,
        "mono",
        "Themed template creation should apply bundled master typography",
      )
      assertEqual(
        themedDeck.master.fontSize,
        13,
        "Themed template creation should apply bundled master sizing",
      )
      assertEqual(
        themedDeck.slides[0]?.elements[0]?.fontFamily,
        "mono",
        "Themed template creation should update title fonts",
      )
      assertEqual(
        themedDeck.slides.length,
        originalPreview.slides.length,
        "Themed template creation should keep the full template slide set",
      )
    },
  },
  {
    name: "theme bundles capture, import, and apply full deck styling",
    run() {
      const deck = createDefaultDeck()
      const firstSlide = deck.slides[0]
      const secondSlide = deck.slides[1]
      assert(firstSlide && secondSlide, "Default deck should include two slides")

      const prepared: Deck = {
        ...deck,
        master: {
          ...deck.master,
          showFooter: true,
          footerText: "Quarterly system",
          showDate: true,
          showSlideNumbers: true,
          color: "#94a3b8",
          fontFamily: "serif",
          fontSize: 14,
          officeTheme: {
            colorSchemeName: "Board colors",
            colors: [
              { key: "accent1", color: "#2563eb" },
              { key: "accent2", color: "#16a34a" },
              { key: "dk1", color: "#111827" },
              { key: "lt1", color: "#f8fafc" },
            ],
            importedAt: "2026-05-15T00:00:00.000Z",
            majorFont: "Aptos Display",
            minorFont: "Aptos",
            name: "Board Theme",
            placeholderDefaultCount: 3,
            slideLayoutCount: 2,
            slideMasterCount: 1,
            source: "pptx",
          },
        },
        slides: [
          {
            ...firstSlide,
            background: "#101827",
            elements: [
              {
                ...createElement("title"),
                id: "theme-title",
                color: "#f8fafc",
                fontFamily: "serif",
              },
              {
                ...createElement("text"),
                id: "theme-body",
                color: "#cbd5e1",
                fontFamily: "mono",
              },
            ],
          },
          secondSlide,
        ],
      }
      const bundle = themeBundleFromDeck(
        prepared,
        firstSlide.id,
        "  Board theme  ",
        new Date("2026-05-15T00:00:00.000Z"),
      )
      assert(
        bundle.id.startsWith("custom-theme:"),
        "Saved theme bundle ids should be custom scoped",
      )
      assertEqual(bundle.label, "Board theme", "Theme bundle names should be trimmed")
      assertEqual(
        bundle.master.footerText,
        "Quarterly system",
        "Theme bundles should capture master footer text",
      )
      assertEqual(
        bundle.fontPair.titleFontFamily,
        "serif",
        "Theme bundles should capture title fonts",
      )
      assertEqual(
        bundle.palette.background,
        "#101827",
        "Theme bundles should capture deck palette colors",
      )

      const parsed = parseThemeBundlesText(serializeThemeBundles([bundle]))
      assertEqual(
        parsed[0]?.master.fontSize,
        14,
        "Theme bundle JSON should round-trip master defaults",
      )
      const imported = importThemeBundlesFromText(serializeThemeBundles([bundle]))
      assertEqual(
        imported.added,
        1,
        "Theme bundle import should accept portable theme bundles",
      )
      const builtIn = builtInThemeBundles.find(
        (item) => item.id === "built-in-theme:graphite",
      )
      assert(builtIn, "Expected graphite built-in theme bundle")
      const themedDeck = applyThemeBundleToDeck(deck, builtIn, firstSlide.id)
      assertEqual(
        themedDeck.slides[0]?.background,
        builtIn.palette.background,
        "Applying a theme bundle should recolor the deck",
      )
      assertEqual(
        themedDeck.slides[0]?.elements[0]?.fontFamily,
        builtIn.fontPair.titleFontFamily,
        "Applying a theme bundle should update title typography",
      )
      assertEqual(
        themedDeck.master.fontSize,
        builtIn.master.fontSize,
        "Applying a theme bundle should restore master defaults",
      )
      assertEqual(
        parseThemeBundlesText("not json").length,
        0,
        "Invalid theme bundle files should fail closed",
      )
      const themeFile = standaloneThemeFilePayloadFromDeck(
        prepared,
        firstSlide.id,
        "Board theme file",
        new Date("2026-05-15T00:00:00.000Z"),
      )
      const themeFileText = serializeStandaloneThemeFile(themeFile)
      const parsedThemeFile = parseStandaloneThemeFile(themeFileText)
      const importedThemeBundle = themeBundleFromStandaloneThemeFile(themeFileText)

      assertEqual(
        standaloneThemeFileName(prepared),
        "board-theme.ess-theme.json",
        "Standalone theme file names should use Office theme metadata when available",
      )
      assertEqual(
        themeFile.themePackageXml.readyPartCount,
        4,
        "Standalone theme files should carry authored theme package XML parts",
      )
      assertEqual(
        standaloneThemeFileSummary(themeFile).packageFileName,
        "board-theme.thmx",
        "Standalone theme summaries should expose reusable theme package names",
      )
      assertEqual(
        parsedThemeFile?.officeTheme?.majorFont,
        "Aptos Display",
        "Standalone theme file JSON should preserve imported Office theme fonts",
      )
      assertEqual(
        importedThemeBundle?.label,
        "Board theme file",
        "Standalone theme imports should recover an applyable custom theme bundle",
      )
      assertEqual(
        parseStandaloneThemeFile("not json"),
        null,
        "Invalid standalone theme files should fail closed",
      )
      const staleBundle = {
        ...bundle,
        id: "custom-theme:stale-board",
        label: "Old board theme",
        createdAt: "2026-03-01T00:00:00.000Z",
        useCount: 0,
      } as const
      const duplicateBundle = {
        ...bundle,
        id: "custom-theme:duplicate-board",
        label: "Board theme copy",
        createdAt: "2026-05-14T00:00:00.000Z",
        lastUsedAt: "2026-05-14T00:00:00.000Z",
        useCount: 1,
      } as const
      const audit = themeBundleCleanupAudit([staleBundle, duplicateBundle], {
        now: new Date("2026-05-15T00:00:00.000Z"),
        staleAfterDays: 30,
      })
      assertEqual(audit.staleCount, 1, "Old theme bundles should be flagged")
      assertEqual(
        audit.unusedCount,
        1,
        "Never-applied theme bundles should be flagged",
      )
      assertEqual(
        audit.duplicateCount,
        1,
        "Duplicate theme bundles should be flagged",
      )
      const usedBundles = markThemeBundleUsedInList(
        [staleBundle, duplicateBundle],
        staleBundle.id,
        new Date("2026-05-15T00:00:00.000Z"),
      )
      assertEqual(
        usedBundles[0]?.useCount,
        1,
        "Applying a custom theme bundle should increment usage metadata",
      )
      assertEqual(
        themeBundleCleanupAudit(usedBundles, {
          now: new Date("2026-05-15T00:00:00.000Z"),
          staleAfterDays: 30,
        }).staleCount,
        0,
        "Recent theme bundle use should clear stale status",
      )
      assertEqual(
        deleteThemeBundlesFromList(
          [staleBundle, duplicateBundle],
          [staleBundle.id],
        ).length,
        1,
        "Cleanup actions should delete selected theme bundles",
      )
    },
  },
  {
    name: "master style presets update footer defaults",
    run() {
      const deck = createDefaultDeck()
      const boardroom = masterStylePresets.find(
        (preset) => preset.id === "boardroom",
      )
      assert(boardroom, "Expected boardroom master style preset")

      const master = applyMasterStylePreset(deck.master, boardroom.id)
      assertEqual(
        master.showFooter,
        true,
        "Master style presets should toggle footer visibility",
      )
      assertEqual(
        master.footerText,
        "Confidential",
        "Master style presets should apply footer text",
      )
      assertEqual(
        master.layoutPresets,
        deck.master.layoutPresets,
        "Master style presets should preserve saved layout presets",
      )
      assert(
        masterStylePresetMatches(master, boardroom),
        "Master style preset matching should detect active preset values",
      )
      const lecture = masterStylePresets.find(
        (preset) => preset.id === "lecture",
      )
      assert(lecture, "Expected lecture master style preset")
      const preview = masterStylePresetPreview(lecture, {
        slideCount: 9,
        slideNumber: 2,
      })
      assertEqual(
        preview.center,
        "Lecture notes",
        "Master style previews should show footer placement",
      )
      assertEqual(
        preview.right,
        "2 / 9",
        "Master style previews should show slide-number placement",
      )
      assertEqual(
        preview.left,
        "",
        "Master style previews should hide disabled date placement",
      )
      const savedPreset = customMasterStylePresetFromMaster(
        {
          ...deck.master,
          showFooter: true,
          footerText: "Client confidential",
          showDate: true,
          showSlideNumbers: true,
          color: "#0f766e",
          fontFamily: "geist",
          fontSize: 11,
        },
        "  Client house style  ",
        new Date("2026-05-15T00:00:00.000Z"),
      )
      assert(
        savedPreset.id.startsWith("custom-master-style:"),
        "Saved master style ids should be custom scoped",
      )
      assertEqual(
        savedPreset.label,
        "Client house style",
        "Saved master style names should be trimmed",
      )
      assertEqual(
        savedPreset.patch.footerText,
        "Client confidential",
        "Saved master styles should capture footer text",
      )
      const parsedPresets = parseCustomMasterStylePresetsText(
        serializeCustomMasterStylePresets([savedPreset]),
      )
      assertEqual(
        parsedPresets[0]?.patch.fontSize,
        11,
        "Custom master style JSON should round-trip footer defaults",
      )
      assertEqual(
        parseCustomMasterStylePresetsText("not json").length,
        0,
        "Invalid master style files should fail closed",
      )
    },
  },
  {
    name: "custom deck templates carry paired theme bundles",
    run() {
      const deck = createDefaultDeck()
      const firstSlide = deck.slides[0]
      const graphite = builtInThemeBundles.find(
        (item) => item.id === "built-in-theme:graphite",
      )
      assert(firstSlide && graphite, "Expected default slide and graphite bundle")

      const themedDeck = applyThemeBundleToDeck(deck, graphite, firstSlide.id)
      const template = customDeckTemplateFromDeck(
        themedDeck,
        "Launch system",
        firstSlide.id,
        new Date("2026-05-15T00:00:00.000Z"),
      )
      assert(template.themeBundle, "Saved templates should capture a theme bundle")
      assertEqual(
        template.themeBundle.master.fontFamily,
        themedDeck.master.fontFamily,
        "Template theme bundles should capture deck master typography",
      )
      assertEqual(
        template.themeBundle.palette.background,
        graphite.palette.background,
        "Template theme bundles should capture the visual palette",
      )

      const recreated = createDeckFromCustomTemplate(template)
      assertEqual(
        recreated.title,
        "Launch system",
        "Custom templates should keep their saved display name",
      )
      assertEqual(
        recreated.master.fontFamily,
        template.themeBundle.master.fontFamily,
        "Using a custom template should reapply the paired theme bundle",
      )
      assert(
        recreated.slides[0]?.id !== template.deck.slides[0]?.id,
        "Using a custom template should create fresh slide ids",
      )
      const parsedTemplates = parseCustomDeckTemplatesText(
        serializeCustomDeckTemplates([template]),
      )
      assertEqual(
        parsedTemplates[0]?.themeBundle?.label,
        "Launch system theme",
        "Custom template JSON should round-trip paired theme bundles",
      )
      assertEqual(
        parseCustomDeckTemplatesText("not json").length,
        0,
        "Invalid custom template files should fail closed",
      )
      const usedTemplates = markCustomDeckTemplateUsedInList(
        [template],
        template.id,
        new Date("2026-05-16T00:00:00.000Z"),
      )
      assertEqual(
        usedTemplates[0]?.useCount,
        1,
        "Custom template usage should increment when a template is opened",
      )
      assertEqual(
        usedTemplates[0]?.lastUsedAt,
        "2026-05-16T00:00:00.000Z",
        "Custom template usage should record last-used time",
      )
      const stats = customDeckTemplateStats(
        [
          usedTemplates[0]!,
          {
            ...template,
            createdAt: "2026-04-01T00:00:00.000Z",
            id: "imported-template",
            source: "imported",
            themeBundle: undefined,
          },
        ],
        new Date("2026-05-16T00:00:00.000Z"),
      )
      assertEqual(stats.total, 2, "Template stats should count templates")
      assertEqual(
        stats.pairedThemeCount,
        1,
        "Template stats should count paired themes",
      )
      assertEqual(
        stats.importedCount,
        1,
        "Template stats should count imported templates",
      )
      assertEqual(
        stats.staleCount,
        1,
        "Template stats should flag stale unused templates",
      )
      const { themeBundle: _themeBundle, ...templateWithoutTheme } = template
      const freshUnpairedTemplate = {
        ...templateWithoutTheme,
        id: "fresh-unpaired-template",
        createdAt: "2026-05-16T09:00:00.000Z",
        useCount: 0,
      }
      const olderPairedTemplate = {
        ...template,
        id: "older-paired-template",
        createdAt: "2026-05-12T09:00:00.000Z",
        lastUsedAt: "2026-05-15T09:00:00.000Z",
        useCount: 3,
      }
      const recommendedTemplates = recommendedCustomDeckTemplates(
        [freshUnpairedTemplate, olderPairedTemplate, usedTemplates[0]!],
        {
          limit: 2,
          now: new Date("2026-05-16T12:00:00.000Z"),
        },
      )
      assertArrayEqual(
        recommendedTemplates.map((item) => item.id),
        [olderPairedTemplate.id, usedTemplates[0]!.id],
        "Template recommendations should prefer paired, fresh, frequently used templates",
      )
      const staleLayoutPreset: DeckLayoutPreset = {
        id: "deck-layout:audit-stale",
        label: "Audit stale",
        description: "2 master placeholders",
        createdAt: "2026-04-01T00:00:00.000Z",
        slots: [
          {
            type: "title",
            placeholderRole: "title",
            x: 8,
            y: 10,
            width: 84,
            height: 14,
            content: "Title",
            fontSize: 40,
            fontFamily: "geist",
            fontWeight: 700,
            textAlign: "left",
            lineHeight: 1.05,
            listStyle: "none",
            textFit: "clip",
            textColumns: 1,
            color: "#111827",
            background: "transparent",
            radius: 0,
            fit: "contain",
            alt: "",
          },
        ],
        useCount: 0,
      }
      const audit = reusableAssetAudit(
        {
          layoutPresets: [staleLayoutPreset],
          templates: [freshUnpairedTemplate, olderPairedTemplate],
          now: new Date("2026-05-16T12:00:00.000Z"),
        },
      )
      assertEqual(
        audit.unusedCount,
        2,
        "Reusable asset audit should count unused templates and master layouts",
      )
      assertEqual(
        audit.staleCount,
        1,
        "Reusable asset audit should count stale reusable assets",
      )
      assertEqual(
        audit.unpairedTemplateCount,
        1,
        "Reusable asset audit should count unpaired custom templates",
      )
      assert(
        audit.issues.some(
          (issue) =>
            issue.assetType === "master-layout" &&
            issue.assetId === staleLayoutPreset.id,
        ),
        "Reusable asset audit should expose master layout cleanup targets",
      )
      assert(
        audit.issues.some(
          (issue) =>
            issue.assetType === "template" &&
            issue.assetId === freshUnpairedTemplate.id,
        ),
        "Reusable asset audit should expose template cleanup targets",
      )
      const mismatchedTemplate = {
        ...template,
        id: "mismatched-template",
        themeBundle: {
          ...template.themeBundle!,
          master: {
            ...template.themeBundle!.master,
            fontSize: template.themeBundle!.master.fontSize + 1,
          },
        },
      }
      const manifest = templatePackageManifest({
        layoutPresets: [staleLayoutPreset],
        now: new Date("2026-05-16T12:00:00.000Z"),
        packageName: "Launch templates",
        templates: [freshUnpairedTemplate, mismatchedTemplate],
      })
      const manifestText = serializeTemplatePackageManifest(manifest)

      assertEqual(
        manifest.packageFileName,
        "launch-templates.manifest.json",
        "Template package manifests should use stable package filenames",
      )
      assertEqual(
        manifest.unpairedTemplateCount,
        1,
        "Template package manifests should count unpaired templates",
      )
      assertEqual(
        manifest.mismatchedThemeCount,
        1,
        "Template package manifests should count paired theme mismatches",
      )
      assert(
        manifestText.includes("essence-template-package-manifest") &&
          manifestText.includes("mismatchedThemeCount"),
        "Serialized template package manifests should expose cleanup diagnostics",
      )
    },
  },
  {
    name: "font pair presets update slide typography and deck master defaults",
    run() {
      const deck = createDefaultDeck()
      const firstSlide = deck.slides[0]
      const secondSlide = deck.slides[1]
      assert(firstSlide && secondSlide, "Default deck should include two slides")
      const editorial = fontPairPresets.find((preset) => preset.id === "editorial")
      const technical = fontPairPresets.find((preset) => preset.id === "technical")
      assert(editorial && technical, "Expected font pair presets to exist")
      const prepared: Deck = {
        ...deck,
        slides: [
          {
            ...firstSlide,
            elements: [
              { ...createElement("title"), id: "title-1" },
              { ...createElement("text"), id: "body-1" },
              { ...createElement("shape"), id: "shape-1" },
            ],
          },
          {
            ...secondSlide,
            elements: [{ ...createElement("title"), id: "title-2" }],
          },
        ],
      }

      const slideApplied = applyFontPairToDeck(
        prepared,
        editorial,
        "slide",
        firstSlide.id,
      )
      assertEqual(
        slideApplied.slides[0]?.elements[0]?.fontFamily,
        "serif",
        "Slide-scoped preset should update title font",
      )
      assertEqual(
        slideApplied.slides[0]?.elements[1]?.fontFamily,
        "system",
        "Slide-scoped preset should update body font",
      )
      assertEqual(
        slideApplied.slides[0]?.elements[2]?.fontFamily,
        "system",
        "Non-text object fonts should stay unchanged",
      )
      assertEqual(
        slideApplied.slides[1]?.elements[0]?.fontFamily,
        "geist",
        "Slide-scoped preset should not update other slides",
      )
      assertEqual(
        slideApplied.master.fontFamily,
        prepared.master.fontFamily,
        "Slide-scoped preset should not rewrite master defaults",
      )

      const deckApplied = applyFontPairToDeck(
        prepared,
        technical,
        "deck",
        firstSlide.id,
      )
      assertEqual(
        deckApplied.master.fontFamily,
        "mono",
        "Deck-scoped preset should update master font defaults",
      )
      assertEqual(
        deckApplied.slides[1]?.elements[0]?.fontFamily,
        "mono",
        "Deck-scoped preset should update title fonts across slides",
      )
      assertEqual(
        normalizeFontFamily("unknown"),
        "geist",
        "Invalid font family values should normalize to the default",
      )
    },
  },
  {
    name: "brand kits bundle palettes, font pairs, and master defaults",
    run() {
      const deck = createDefaultDeck()
      const firstSlide = deck.slides[0]
      const secondSlide = deck.slides[1]
      assert(firstSlide && secondSlide, "Default deck should include two slides")
      const boardroom = brandKitPresets.find((kit) => kit.id === "boardroom")
      assert(boardroom, "Expected boardroom brand kit")

      const prepared: Deck = {
        ...deck,
        slides: [
          {
            ...firstSlide,
            elements: [
              { ...createElement("title"), id: "title-1" },
              { ...createElement("text"), id: "body-1" },
            ],
          },
          {
            ...secondSlide,
            background: "#ffffff",
            elements: [{ ...createElement("title"), id: "title-2" }],
          },
        ],
      }

      const slideScoped = applyBrandKitToDeck(
        prepared,
        boardroom,
        "slide",
        firstSlide.id,
      )
      assertEqual(
        slideScoped.master,
        prepared.master,
        "Slide-scoped brand kits should not change master defaults",
      )
      assertEqual(
        slideScoped.slides[0]?.background,
        boardroom.palette.background,
        "Slide-scoped brand kits should recolor the active slide",
      )
      assertEqual(
        slideScoped.slides[1]?.background,
        "#ffffff",
        "Slide-scoped brand kits should not recolor other slides",
      )

      const deckScoped = applyBrandKitToDeck(
        prepared,
        boardroom,
        "deck",
        firstSlide.id,
      )
      assertEqual(
        deckScoped.master.fontSize,
        boardroom.masterFontSize,
        "Deck-scoped brand kits should update master font size",
      )
      assertEqual(
        deckScoped.master.fontFamily,
        boardroom.fontPair.masterFontFamily,
        "Deck-scoped brand kits should update master font family",
      )
      assertEqual(
        deckScoped.slides[1]?.background,
        boardroom.palette.background,
        "Deck-scoped brand kits should recolor all slides",
      )
      assertEqual(
        deckScoped.slides[0]?.elements[0]?.fontFamily,
        boardroom.fontPair.titleFontFamily,
        "Deck-scoped brand kits should apply title fonts",
      )

      const customKit = customBrandKitFromDeck(
        {
          ...prepared,
          master: {
            ...prepared.master,
            fontFamily: "mono",
            fontSize: 13,
          },
          slides: [
            {
              ...firstSlide,
              background: "#101827",
              elements: [
                {
                  ...createElement("title"),
                  color: "#f8fafc",
                  fontFamily: "serif",
                },
                {
                  ...createElement("text"),
                  color: "#cbd5e1",
                  fontFamily: "mono",
                },
              ],
            },
            secondSlide,
          ],
        },
        firstSlide.id,
        "  Launch system  ",
        new Date("2026-05-15T00:00:00.000Z"),
      )
      assert(
        customKit.id.startsWith("custom-brand:"),
        "Saved brand kit ids should be custom scoped",
      )
      assertEqual(customKit.label, "Launch system", "Brand kit names should be trimmed")
      assertEqual(
        customKit.palette.background,
        "#101827",
        "Saved brand kits should capture the current slide palette",
      )
      assertEqual(
        customKit.fontPair.titleFontFamily,
        "serif",
        "Saved brand kits should capture title typography",
      )
      assertEqual(
        customKit.fontPair.bodyFontFamily,
        "mono",
        "Saved brand kits should capture body typography",
      )
      assertEqual(
        customKit.masterFontSize,
        13,
        "Saved brand kits should capture master font size",
      )
      const parsed = parseCustomBrandKitsText(
        serializeCustomBrandKits([customKit]),
      )
      assertEqual(
        parsed[0]?.label,
        "Launch system",
        "Brand kit export JSON should round-trip saved kits",
      )
      assertEqual(
        parseCustomBrandKitsText("not json").length,
        0,
        "Invalid brand kit files should fail closed",
      )
      const olderKit = {
        ...customKit,
        id: "custom-brand:older-system",
        label: "Older system",
        createdAt: "2026-05-14T00:00:00.000Z",
      } as const
      assertArrayEqual(
        recommendedCustomBrandKits([olderKit, customKit], { limit: 1 }).map(
          (item) => item.id,
        ),
        [customKit.id],
        "Custom brand kit recommendations should prefer recently saved kits",
      )
    },
  },
  {
    name: "layout placeholders persist role metadata and reuse matching slots",
    run() {
      const deck = createDefaultDeck()
      const firstSlide = deck.slides[0]
      assert(firstSlide, "Default deck should include a first slide")

      const pictureLayout = applyLayoutPlaceholders(
        {
          ...firstSlide,
          elements: [],
        },
        "picture-caption",
      )

      assertArrayEqual(
        pictureLayout.elements.map((element) => element.placeholderRole),
        ["title", "media", "caption"],
        "Picture caption layout should tag title, media, and caption placeholders",
      )

      const body = {
        ...createElement("text"),
        id: "body-placeholder",
        content: "Keep this body copy",
        placeholderRole: "body" as const,
      }
      const caption = {
        ...createElement("text"),
        id: "caption-placeholder",
        content: "Keep this caption",
        placeholderRole: "caption" as const,
      }
      const comparison = applyLayoutPlaceholders(
        {
          ...firstSlide,
          layout: "title-body",
          elements: [caption, body],
        },
        "comparison",
      )

      assertEqual(
        comparison.elements.find((element) => element.id === body.id)?.content,
        "Keep this body copy",
        "Layout application should prefer matching body placeholders",
      )
      assertEqual(
        comparison.elements.find((element) => element.id === caption.id)?.content,
        "Keep this caption",
        "Non-matching placeholders should not be consumed before matching slots",
      )

      const lockedTitle = {
        ...createElement("title"),
        id: "locked-title-placeholder",
        content: "Locked title",
        locked: true,
        placeholderRole: "title" as const,
      }
      const lockedLayout = applyLayoutPlaceholders(
        {
          ...firstSlide,
          elements: [lockedTitle],
        },
        "title-body",
      )

      assertEqual(
        lockedLayout.elements.filter(
          (element) => element.placeholderRole === "title",
        ).length,
        1,
        "Locked matching placeholders should reserve their layout slot",
      )
      assertEqual(
        lockedLayout.elements.find((element) => element.id === lockedTitle.id)
          ?.content,
        "Locked title",
        "Locked placeholder content should be preserved during layout reapply",
      )
    },
  },
  {
    name: "custom slide layouts capture and reapply placeholder geometry",
    run() {
      const deck = createDefaultDeck()
      const firstSlide = deck.slides[0]
      assert(firstSlide, "Default deck should include a first slide")
      const sourceSlide = {
        ...firstSlide,
        elements: [
          {
            ...createElement("title"),
            id: "source-title",
            content: "Saved headline",
            placeholderRole: "title" as const,
            x: 12,
            y: 11,
            width: 62,
            height: 12,
            fontFamily: "serif" as const,
          },
          {
            ...createElement("text"),
            id: "source-body",
            content: "Saved body placeholder",
            placeholderRole: "body" as const,
            x: 18,
            y: 34,
            width: 58,
            height: 28,
          },
        ],
      }
      const layout = customSlideLayoutFromSlide(
        sourceSlide,
        "  Investor layout  ",
        new Date("2026-05-15T00:00:00.000Z"),
      )
      assert(layout, "Tagged placeholders should create a custom layout")
      assertEqual(layout.label, "Investor layout", "Custom layout names should be trimmed")
      assertEqual(layout.slots.length, 2, "Custom layout should capture tagged placeholders")

      const targetSlide = {
        ...firstSlide,
        elements: [
          {
            ...createElement("title"),
            id: "target-title",
            content: "Keep existing title",
            placeholderRole: "title" as const,
          },
        ],
      }
      const applied = applyCustomSlideLayout(targetSlide, layout)
      const title = applied.elements.find((element) => element.id === "target-title")
      const body = applied.elements.find(
        (element) => element.placeholderRole === "body",
      )

      assertEqual(title?.content, "Keep existing title", "Applying a layout should preserve existing content")
      assertEqual(title?.x, 12, "Applying a layout should reuse saved geometry")
      assertEqual(title?.fontFamily, "serif", "Applying a layout should reuse saved typography")
      assert(body, "Missing placeholder slots should be added")
      assertEqual(body?.x, 18, "Added placeholder should use captured geometry")

      const lockedBodyTarget = {
        ...firstSlide,
        elements: [
          {
            ...createElement("text"),
            id: "locked-body",
            content: "Locked body",
            locked: true,
            placeholderRole: "body" as const,
          },
        ],
      }
      const lockedApplied = applyCustomSlideLayout(lockedBodyTarget, layout)

      assertEqual(
        lockedApplied.elements.filter(
          (element) => element.placeholderRole === "body",
        ).length,
        1,
        "Locked custom-layout placeholders should reserve matching slots",
      )
      assertEqual(
        lockedApplied.elements.find((element) => element.id === "locked-body")
          ?.content,
        "Locked body",
        "Custom layout reapply should preserve locked placeholder content",
      )

      const secondTargetSlide = {
        ...firstSlide,
        id: "target-slide-2",
        elements: [
          {
            ...createElement("title"),
            id: "second-title",
            content: "Second selected title",
            placeholderRole: "title" as const,
          },
        ],
      }
      const untouchedSlide = {
        ...firstSlide,
        id: "target-slide-3",
        elements: [],
      }
      const bulkApplied = applyCustomSlideLayoutToSlides(
        [targetSlide, secondTargetSlide, untouchedSlide],
        layout,
        [targetSlide.id, secondTargetSlide.id],
      )
      assertEqual(
        bulkApplied.appliedCount,
        2,
        "Bulk custom layout application should report selected slide count",
      )
      assertEqual(
        bulkApplied.slides[1]?.elements[0]?.x,
        12,
        "Bulk custom layout application should update selected slides",
      )
      assertEqual(
        bulkApplied.slides[2]?.elements.length,
        0,
        "Bulk custom layout application should leave unselected slides unchanged",
      )
      const deckPresetResult = saveDeckLayoutPreset(
        deck.master,
        sourceSlide,
        "  Master hero  ",
      )
      const deckPreset = deckPresetResult.master.layoutPresets[0]
      assert(deckPresetResult.saved && deckPreset, "Tagged slides should save deck layout presets")
      assert(
        deckPreset.id.startsWith("deck-layout:"),
        "Deck layout presets should use master-scoped ids",
      )
      assertEqual(
        deckPreset.label,
        "Master hero",
        "Deck layout preset names should be trimmed",
      )
      const normalizedMaster = normalizeDeckMaster(deckPresetResult.master)
      assertEqual(
        normalizedMaster.layoutPresets[0]?.slots.length,
        2,
        "Deck master normalization should preserve layout preset slots",
      )
      const usedMaster = markDeckLayoutPresetUsed(
        normalizedMaster,
        deckPreset.id,
        new Date("2026-05-15T12:00:00.000Z"),
      )
      assertEqual(
        usedMaster.layoutPresets[0]?.useCount,
        1,
        "Deck layout preset usage should increment when applied",
      )
      assertEqual(
        usedMaster.layoutPresets[0]?.lastUsedAt,
        "2026-05-15T12:00:00.000Z",
        "Deck layout preset usage should record last-used timestamps",
      )
      const variantPreset = {
        ...deckPreset,
        slots: [
          ...deckPreset.slots,
          {
            ...deckPreset.slots[1]!,
            type: "image" as const,
            placeholderRole: "media" as const,
            x: 52,
            y: 34,
            width: 30,
            height: 28,
            alt: "Variant media",
          },
        ],
      }
      const variants = masterLayoutVariantsForPreset(variantPreset)
      const mirroredVariant = variants.find(
        (variant) => variant.variantId === "mirrored",
      )
      const stackedVariant = variants.find(
        (variant) => variant.variantId === "stacked",
      )

      assert(mirroredVariant, "Master layout presets should expose mirror variants")
      assert(stackedVariant, "Master layout presets should expose stacked variants")
      assertEqual(
        mirroredVariant.sourcePresetId,
        deckPreset.id,
        "Master layout variants should stay linked to their source preset",
      )
      assertEqual(
        mirroredVariant.slots[0]?.x,
        26,
        "Mirror variants should flip placeholder x positions across the slide",
      )
      assertEqual(
        stackedVariant.slots.filter((slot) => slot.placeholderRole !== "title")
          .length,
        2,
        "Stacked variants should preserve content placeholder count",
      )
      assertEqual(
        stackedVariant.slots[1]?.width,
        64,
        "Stacked variants should share the combined content width",
      )
      const editedMaster = updateDeckLayoutPresetSlot(
        updateDeckLayoutPreset(usedMaster, deckPreset.id, {
          description: "  Editable master layout  ",
          label: "  Board master  ",
        }),
        deckPreset.id,
        0,
        {
          content: "Edited master title",
          width: 120,
          x: 20,
        },
      )
      const editedPreset = editedMaster.layoutPresets.find(
        (preset) => preset.id === deckPreset.id,
      )

      assertEqual(
        editedPreset?.label,
        "Board master",
        "Master layout preset labels should be editable in place",
      )
      assertEqual(
        editedPreset?.description,
        "Editable master layout",
        "Master layout preset descriptions should be editable in place",
      )
      assertEqual(
        editedPreset?.slots[0]?.content,
        "Edited master title",
        "Master layout slot text should be editable in place",
      )
      assertEqual(
        editedPreset?.slots[0]?.width,
        80,
        "Master layout slot geometry should clamp to the slide bounds",
      )
      const stalePreset = {
        ...deckPreset,
        id: "deck-layout:stale-master",
        label: "Stale master",
        createdAt: "2026-05-14T09:00:00.000Z",
        lastUsedAt: "2026-05-14T12:00:00.000Z",
        useCount: 8,
      } as const
      const unusedPreset = {
        ...deckPreset,
        id: "deck-layout:unused-master",
        label: "Unused master",
        createdAt: "2026-05-15T13:00:00.000Z",
        useCount: 0,
      } as const
      const recommendedPresets = recommendedDeckLayoutPresets(
        {
          ...usedMaster,
          layoutPresets: [
            stalePreset,
            unusedPreset,
            ...usedMaster.layoutPresets,
          ],
        },
        { limit: 2 },
      )
      assertArrayEqual(
        recommendedPresets.map((preset) => preset.id),
        [deckPreset.id, stalePreset.id],
        "Deck layout recommendations should prefer the most recently used presets",
      )
      const presetBundle = serializeDeckLayoutPresets([deckPreset])
      const parsedDeckPresets = parseDeckLayoutPresetsText(presetBundle)
      assertEqual(
        parsedDeckPresets[0]?.label,
        "Master hero",
        "Deck layout preset JSON should round-trip",
      )
      const importedMaster = importDeckLayoutPresetsToMaster(
        { ...deck.master, layoutPresets: [] },
        presetBundle,
      )
      assertEqual(
        importedMaster.added,
        1,
        "Deck layout preset import should accept portable master presets",
      )
      assertEqual(
        importedMaster.master.layoutPresets[0]?.slots.length,
        2,
        "Imported deck layout presets should preserve placeholder slots",
      )
      assertEqual(
        importDeckLayoutPresetsToMaster(
          importedMaster.master,
          presetBundle,
        ).added,
        0,
        "Deck layout preset import should skip duplicate preset ids",
      )
      const deletedMaster = deleteDeckLayoutPreset(
        normalizedMaster,
        deckPreset.id,
      )
      assertEqual(
        deletedMaster.layoutPresets.length,
        0,
        "Deck layout presets should be removable from the master",
      )

      const parsed = parseCustomSlideLayoutsText(
        serializeCustomSlideLayouts([layout]),
      )
      assertEqual(parsed[0]?.label, "Investor layout", "Custom layout JSON should round-trip")
      const imported = importCustomSlideLayoutsFromText(
        serializeCustomSlideLayouts([layout]),
      )
      assertEqual(
        imported.added,
        1,
        "Custom layout import should accept portable layout bundles",
      )
      assertEqual(
        imported.layouts[0]?.label,
        "Investor layout",
        "Custom layout import should return the imported layouts",
      )
      assertEqual(
        parseCustomSlideLayoutsText("not json").length,
        0,
        "Invalid custom layout files should fail closed",
      )
    },
  },
  {
    name: "master theme safeguards flag reapply risks and metadata gaps",
    run() {
      const deck = createDefaultDeck()
      const firstSlide = deck.slides[0]
      assert(firstSlide, "Default deck should include a first slide")

      const titlePlaceholder = {
        ...createElement("title"),
        id: "safeguard-title",
        content: "Board update",
        placeholderRole: "title" as const,
        fontFamily: "serif" as const,
        x: 20,
      }
      const lockedMediaPlaceholder = {
        ...createElement("image"),
        id: "safeguard-media",
        placeholderRole: "media" as const,
        locked: true,
      }
      const sourceSlide = {
        ...firstSlide,
        id: "safeguard-source",
        title: "Source master",
        elements: [
          {
            ...createElement("title"),
            placeholderRole: "title" as const,
            x: 8,
            width: 70,
          },
        ],
      }
      const savedMaster = saveDeckLayoutPreset(
        deck.master,
        sourceSlide,
        "Board master",
      )
      const preset = savedMaster.master.layoutPresets[0]
      assert(preset, "Expected saved master layout preset")

      const riskyDeck = {
        ...deck,
        master: {
          ...savedMaster.master,
          layoutPresets: [
            {
              ...preset,
              createdAt: "bad-date",
              description: "",
              useCount: 0,
            },
            {
              ...preset,
              id: "deck-layout:duplicate-name" as const,
              label: preset.label,
              createdAt: "2025-12-01T00:00:00.000Z",
              useCount: 0,
            },
          ],
        },
        slides: [
          {
            ...firstSlide,
            title: "Risky slide",
            elements: [titlePlaceholder, lockedMediaPlaceholder],
          },
        ],
      }

      const report = masterThemeSafeguardReport(
        riskyDeck,
        new Date("2026-05-15T00:00:00.000Z"),
      )

      assertEqual(
        report.status,
        "attention",
        "Safeguard report should block risky bulk reapply workflows",
      )
      assertEqual(
        report.metrics.manualOverrideCount,
        1,
        "Safeguard report should count placeholder style or geometry overrides",
      )
      assertEqual(
        report.metrics.lockedPlaceholderCount,
        1,
        "Safeguard report should count locked placeholders",
      )
      assertEqual(
        report.metrics.unmatchedPlaceholderCount,
        1,
        "Safeguard report should flag placeholder roles missing from master layouts",
      )
      assertEqual(
        report.metrics.bulkReapplyRiskSlideCount,
        1,
        "Safeguard report should count risky slides once",
      )
      assert(
        report.issues.some((issue) => issue.id === "master-metadata-gaps"),
        "Safeguard report should surface theme-file metadata gaps",
      )
      assert(
        report.issues.some(
          (issue) => issue.id === "duplicate-master-layout-names",
        ),
        "Safeguard report should surface duplicate master layout names",
      )
      assert(
        report.issues.some((issue) => issue.id === "bulk-reapply-risk"),
        "Safeguard report should include a bulk reapply review issue",
      )
    },
  },
  {
    name: "native pptx master layout plan reports reusable placeholders",
    run() {
      const deck = createDefaultDeck()
      const [firstSlide, ...restSlides] = deck.slides
      assert(firstSlide, "Default deck should include a first slide")
      const layoutSlide = {
        ...firstSlide,
        elements: [
          {
            ...createElement("title"),
            id: "layout-title",
            animation: "fade",
            content: "Quarterly review",
            placeholderRole: "title",
            x: 8,
            y: 10,
            width: 80,
            height: 12,
          },
          {
            ...createElement("text"),
            id: "layout-body",
            content: "Key points",
            linkUrl: "https://example.com/review",
            placeholderRole: "body",
            x: 8,
            y: 28,
            width: 38,
            height: 28,
          },
          {
            ...createElement("image"),
            id: "layout-media",
            placeholderRole: "media",
            x: 52,
            y: 28,
            width: 36,
            height: 28,
          },
        ],
        comments: [
          {
            id: "comment-root",
            authorName: "Avery Reviewer",
            body: "Preserve this native thread",
            createdAt: "2026-05-15T10:00:00.000Z",
            mentions: [],
            resolved: false,
            source: "pptx",
            sourceAnchor: { x: 1200000, y: 1400000 },
            sourceCommentId: "ppt-comment-1",
            sourceThreadId: "ppt-thread-1",
            targetElementId: "layout-title",
            updatedAt: "2026-05-15T10:00:00.000Z",
          },
        ],
      } satisfies Slide
      const saved = saveDeckLayoutPreset(deck.master, layoutSlide, "Native review")

      assert(saved.saved, "Layout preset should be saved from placeholder objects")

      const planDeck = {
        ...deck,
        master: {
          ...saved.master,
          showDate: true,
          showFooter: true,
          showSlideNumbers: true,
          footerText: "Confidential",
          officeTheme: {
            source: "pptx",
            name: "Apex",
            colorSchemeName: "Apex Colors",
            colors: [
              { key: "accent1", color: "#2563EB" },
              { key: "accent2", color: "#16A34A" },
            ],
            majorFont: "Aptos Display",
            minorFont: "Aptos",
            slideMasterCount: 1,
            slideLayoutCount: 1,
            placeholderDefaultCount: 3,
            importedAt: "2026-05-15T00:00:00.000Z",
          },
        },
        slides: [layoutSlide, ...restSlides],
      } satisfies Deck
      const plan = nativePptxMasterLayoutPlan(planDeck)
      const xmlPlan = nativePptxMasterXmlPlan(planDeck)
      const xmlPlanText = serializeNativePptxMasterXmlPlan(planDeck)
      const authoringPlan = pptxMasterXmlAuthoringPlan(planDeck)
      const authoringPlanText = serializePptxMasterXmlAuthoringPlan(planDeck)
      const masterLayoutXmlAuthoring = pptxMasterLayoutXmlAuthoring(planDeck)
      const masterLayoutXmlText =
        serializePptxMasterLayoutXmlAuthoring(planDeck)
      const slideMasterXmlPart = masterLayoutXmlAuthoring.parts.find(
        (part) => part.path === "ppt/slideMasters/slideMaster1.xml",
      )
      const slideLayoutXmlPart = masterLayoutXmlAuthoring.parts.find(
        (part) => part.path === "ppt/slideLayouts/slideLayout1.xml",
      )
      const themePackageText = serializePptxThemePackagePlan(planDeck)
      const themePackageXmlAuthoring = pptxThemePackageXmlAuthoring(planDeck)
      const themePackageXmlText =
        serializePptxThemePackageXmlAuthoring(planDeck)
      const themeXmlPart = themePackageXmlAuthoring.parts.find(
        (part) => part.path === "ppt/theme/theme1.xml",
      )
      const packageEntries = {
        "[Content_Types].xml": utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
</Types>`),
        "_rels/.rels": utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdOfficeDoc" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`),
        "ppt/theme/theme1.xml": utf8(
          `<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Old"/>`,
        ),
        "ppt/slideMasters/slideMaster1.xml": utf8(
          `<p:sldMaster xmlns:p="${presentationNamespace}"/>`,
        ),
        "ppt/slideLayouts/slideLayout1.xml": utf8(
          `<p:sldLayout xmlns:p="${presentationNamespace}"/>`,
        ),
        "ppt/commentAuthors.xml": utf8(
          `<p:cmAuthorLst xmlns:p="${presentationNamespace}"/>`,
        ),
        "ppt/comments/comment1.xml": utf8(
          `<p:cmLst xmlns:p="${presentationNamespace}"/>`,
        ),
        "ppt/slides/slide1.xml": utf8(
          `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="${presentationNamespace}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/></p:nvGrpSpPr><p:grpSpPr/><p:sp><p:nvSpPr><p:cNvPr id="2" name="Quarterly review"/></p:nvSpPr></p:sp><p:sp><p:nvSpPr><p:cNvPr id="3" name="Key points"/></p:nvSpPr></p:sp><p:sp><p:nvSpPr><p:cNvPr id="4" name="Layout media"/></p:nvSpPr></p:sp></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`,
        ),
        "ppt/slides/_rels/slide1.xml.rels": utf8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdSlideLayout" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`),
      }
      const nativePackagePreflightAuthoring =
        pptxNativePackageAuthoring(planDeck)
      const nativePackageAuthoring = pptxNativePackageAuthoring(
        planDeck,
        packageEntries,
      )
      const nativePackageText = serializePptxNativePackageAuthoring(
        planDeck,
        packageEntries,
      )
      const nativePackageResult = applyNativePptxPackageAuthoringToEntries(
        packageEntries,
        planDeck,
      )
      const nativeOfficeParity = nativeOfficePackageParityReport(
        planDeck,
        packageEntries,
      )
      const nativeOfficeParityText =
        serializeNativeOfficePackageParityReport(nativeOfficeParity)
      const report = pptxExportPreflight(planDeck)
      const themeVariantRepair = officeThemeVariantRepairReport(planDeck)
      const themeVariantRepairText =
        serializeOfficeThemeVariantRepairReport(themeVariantRepair)
      const missingThemeRepair = officeThemeVariantRepairReport({
        ...deck,
        master: {
          ...deck.master,
          layoutPresets: [],
          officeTheme: null,
        },
      })

      assertEqual(
        plan.status,
        "partial",
        "Plan should stay honest while current export still flattens master overlays",
      )
      assertEqual(
        plan.nativeMasterPlaceholderCount,
        3,
        "Date, footer, and slide number defaults should be native-ready",
      )
      assertEqual(
        plan.layoutPresetCount,
        1,
        "Saved master layout presets should be counted",
      )
      assertEqual(
        plan.nativeLayoutCandidateCount,
        1,
        "Text and media placeholder layouts should be native candidates",
      )
      assertEqual(
        plan.candidateLayoutSlotCount,
        3,
        "All placeholder slots should be mapped to native placeholder kinds",
      )
      assertEqual(
        plan.themeFontReady,
        true,
        "Imported Office major/minor fonts should be native layout ready",
      )
      assert(
        plan.coveredRoles.includes("title") &&
          plan.coveredRoles.includes("body") &&
          plan.coveredRoles.includes("media"),
        "Plan should expose native placeholder role coverage",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "native-master-placeholders" && metric.value === "3",
        ),
        "PPTX preflight should count native master placeholder candidates",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "native-layout-candidates" && metric.value === "1/1",
        ),
        "PPTX preflight should count reusable native layout candidates",
      )
      assert(
        report.metrics.some(
          (metric) => metric.id === "theme-fonts" && metric.value === "Ready",
        ),
        "PPTX preflight should show imported Office theme fonts as ready",
      )
      assertEqual(
        xmlPlan.themeFileHandoff.status,
        "ready",
        "Native master XML plan should expose reusable theme-file readiness",
      )
      assertEqual(
        xmlPlan.themeFileHandoff.exportFileName,
        "apex-theme.xml",
        "Native master XML plan should provide stable theme export filenames",
      )
      assertEqual(
        xmlPlan.themePackagePlan.status,
        "ready",
        "Theme package plan should be ready when Office metadata has colors and fonts",
      )
      assertEqual(
        xmlPlan.themePackagePlan.packageFileName,
        "apex.thmx",
        "Theme package plan should provide stable reusable theme package filenames",
      )
      assertEqual(
        themeVariantRepair.status,
        "ready",
        "Theme variant repair report should pass when source theme, package XML, variants, and inheritance are ready",
      )
      assert(
        themeVariantRepair.metrics.variantCount >= 3,
        "Theme variant repair report should count original, mirror, and stack master variants",
      )
      assertEqual(
        themeVariantRepair.metrics.sourceThemeAvailable,
        true,
        "Theme variant repair report should preserve imported PowerPoint source theme review",
      )
      assertEqual(
        missingThemeRepair.status,
        "attention",
        "Theme variant repair report should require owner action when theme metadata is absent",
      )
      assert(
        missingThemeRepair.actions.some(
          (item) => item.id === "complete-theme-metadata",
        ) &&
          missingThemeRepair.actions.some(
            (item) => item.id === "save-master-variants",
          ),
        "Theme variant repair report should expose metadata and master variant repair actions",
      )
      assert(
        xmlPlan.themePackagePlan.packageParts.some(
          (part) =>
            part.path === "ppt/theme/theme1.xml" && part.status === "ready",
        ),
        "Theme package plan should include ready theme1.xml package metadata",
      )
      assertEqual(
        xmlPlan.themePackageXmlAuthoring.readyPartCount,
        4,
        "Native master XML plan should carry authored theme package XML parts",
      )
      assertEqual(
        themePackageXmlAuthoring.readyPartCount,
        4,
        "Theme package XML authoring should produce all reusable package parts",
      )
      assert(
        Boolean(
          themeXmlPart?.xml.includes('<a:theme') &&
            themeXmlPart.xml.includes('name="Apex"') &&
            themeXmlPart.xml.includes('<a:accent1><a:srgbClr val="2563EB"') &&
            themeXmlPart.xml.includes('typeface="Aptos Display"'),
        ),
        "Theme package XML authoring should preserve theme identity, colors, and fonts",
      )
      assertEqual(
        authoringPlan.readyTaskCount,
        10,
        "Theme package parts, master placeholders, and layout placeholders should become authoring tasks",
      )
      assertEqual(
        authoringPlan.handoffTaskCount,
        0,
        "Fully mapped placeholders should not require master/layout XML handoff tasks",
      )
      assertEqual(
        authoringPlan.masterPlaceholderTaskCount,
        3,
        "Date, footer, and slide-number defaults should become slide-master authoring tasks",
      )
      assertEqual(
        authoringPlan.layoutPlaceholderTaskCount,
        3,
        "Saved layout slots should become slide-layout authoring tasks",
      )
      assert(
        authoringPlan.tasks.some(
          (task) =>
            task.partPath === "ppt/slideLayouts/slideLayout1.xml" &&
            task.placeholderKind === "title" &&
            task.geometry === "8,10,80,12",
        ),
        "Authoring plan should retain native layout placeholder geometry",
      )
      assertEqual(
        xmlPlan.authoringPlan.readyTaskCount,
        authoringPlan.readyTaskCount,
        "Native master XML plan should carry the authoring task plan",
      )
      assertEqual(
        xmlPlan.masterLayoutXmlAuthoring.readyPartCount,
        2,
        "Native master XML plan should carry authored master/layout XML parts",
      )
      assertEqual(
        masterLayoutXmlAuthoring.placeholderCount,
        6,
        "Master/layout XML authoring should promote master and layout placeholders",
      )
      assert(
        Boolean(
          slideMasterXmlPart?.xml.includes('<p:ph type="dt"') &&
            slideMasterXmlPart.xml.includes('<p:ph type="ftr"') &&
            slideMasterXmlPart.xml.includes('<p:ph type="sldNum"'),
        ),
        "Slide master XML should include native date, footer, and slide-number placeholders",
      )
      assert(
        Boolean(
          slideLayoutXmlPart?.xml.includes('name="Native review"') &&
            slideLayoutXmlPart.xml.includes('<p:ph type="title" idx="1"') &&
            slideLayoutXmlPart.xml.includes('<p:ph type="body" idx="2"') &&
            slideLayoutXmlPart.xml.includes('<p:ph type="media" idx="3"') &&
            slideLayoutXmlPart.xml.includes('x="975360"') &&
            slideLayoutXmlPart.xml.includes('cx="9753600"'),
        ),
        "Slide layout XML should include native placeholder types and EMU geometry",
      )
      assertEqual(
        xmlPlan.readyPartCount,
        2,
        "Theme and fully mapped layout XML parts should be ready",
      )
      assertEqual(
        xmlPlan.totalPartCount,
        3,
        "Theme, slide-master, and saved layout XML parts should be planned",
      )
      assertEqual(
        xmlPlan.placeholderInheritanceIssueCount,
        0,
        "Matching placeholders should clear inheritance diagnostics",
      )
      assert(
        xmlPlan.xmlParts.some(
          (part) =>
            part.path === "ppt/slideLayouts/slideLayout1.xml" &&
            part.status === "ready",
        ),
        "Native master XML plan should include ready slide-layout package paths",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "native-master-xml-parts" && metric.value === "2/3",
        ),
        "PPTX preflight should expose explicit master XML part readiness",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "native-master-authoring" &&
            metric.value === "10/10",
        ),
        "PPTX preflight should expose native master/layout authoring task readiness",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "master-layout-xml-parts" &&
            metric.value === "2/2",
        ),
        "PPTX preflight should expose authored master/layout XML part readiness",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "master-layout-xml-placeholders" &&
            metric.value === "6",
        ),
        "PPTX preflight should expose authored native placeholder counts",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "native-master-handoffs" && metric.value === "0",
        ),
        "PPTX preflight should expose native master/layout handoff counts",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "theme-file-handoff" && metric.value === "Ready",
        ),
        "PPTX preflight should expose reusable theme-file handoff readiness",
      )
      assert(
        report.metrics.some(
          (metric) => metric.id === "theme-package-parts" && metric.value === "4/4",
        ),
        "PPTX preflight should expose theme package part readiness",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "theme-package-xml-parts" &&
            metric.value === "4/4",
        ),
        "PPTX preflight should expose concrete theme package XML authoring readiness",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "theme-package-xml-size" &&
            Number(metric.value) > 0,
        ),
        "PPTX preflight should expose authored theme XML size",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "theme-package-file" && metric.value === "Ready",
        ),
        "PPTX preflight should expose theme package file readiness",
      )
      assertEqual(
        nativePackagePreflightAuthoring.readyPartCount,
        11,
        "Preflight package authoring should compose ready theme, master/layout, comment, and action XML parts",
      )
      assertEqual(
        nativePackagePreflightAuthoring.totalPartCount,
        11,
        "Preflight package authoring should count every package part available without slide XML entries",
      )
      assertEqual(
        nativePackageAuthoring.readyPartCount,
        12,
        "Package authoring with slide XML should add native animation timing writes",
      )
      assertEqual(
        nativePackageAuthoring.mergePartCount,
        7,
        "Package authoring should distinguish merge-sensitive content, relationship, overlay, and timing writes",
      )
      assert(
        nativePackageAuthoring.parts.some(
          (part) =>
            part.path === "ppt/slides/slide1.xml" &&
            part.source === "animation" &&
            part.strategy === "replace-slide-timing",
        ),
        "Package authoring should include native timing replacement for stable animation targets",
      )
      assertEqual(
        nativeOfficeParity.readySectionCount,
        3,
        "Native Office parity should mark theme, relationships, and package authoring ready while diagram conversion awaits deck candidates",
      )
      assertEqual(
        nativeOfficeParity.totalSectionCount,
        4,
        "Native Office parity should cover diagrams, theme application, relationships, and package authoring",
      )
      assertEqual(
        nativeOfficeParity.readyRelationshipCount,
        5,
        "Native Office parity should verify all theme and master/layout relationship checks",
      )
      assert(
        nativeOfficeParity.relationshipChecks.some(
          (check) =>
            check.id === "slide-master-layout-relationships" &&
            check.status === "ready" &&
            check.path === "ppt/slideMasters/_rels/slideMaster1.xml.rels",
        ),
        "Native Office parity should expose the slide-master to layout relationship path",
      )
      assert(
        nativePackageResult.changed &&
          nativePackageResult.appliedPartCount >= 10 &&
          nativePackageResult.skippedPartIds.length === 0,
        "Package authoring should safely apply ready XML parts to existing package entries",
      )
      assert(
        strFromU8(nativePackageResult.entries["[Content_Types].xml"]!).includes(
          '/ppt/theme/theme1.xml',
        ),
        "Package authoring should merge reusable theme content-type overrides",
      )
      assert(
        strFromU8(nativePackageResult.entries["_rels/.rels"]!).includes(
          "ppt/theme/theme1.xml",
        ),
        "Package authoring should merge package-level theme relationships",
      )
      assert(
        strFromU8(
          nativePackageResult.entries["ppt/theme/theme1.xml"]!,
        ).includes('name="Apex"'),
        "Package authoring should replace the theme XML package entry",
      )
      assert(
        strFromU8(
          nativePackageResult.entries["ppt/slideMasters/slideMaster1.xml"]!,
        ).includes('<p:ph type="sldNum"'),
        "Package authoring should replace slide-master XML with native placeholders",
      )
      assert(
        strFromU8(
          nativePackageResult.entries["ppt/slideLayouts/slideLayout1.xml"]!,
        ).includes('name="Native review"'),
        "Package authoring should replace saved slide-layout XML",
      )
      assert(
        strFromU8(nativePackageResult.entries["ppt/commentAuthors.xml"]!).includes(
          "Avery Reviewer",
        ) &&
          strFromU8(
            nativePackageResult.entries["ppt/comments/comment1.xml"]!,
          ).includes("ppt-thread-1"),
        "Package authoring should write native comment authors and thread XML",
      )
      assert(
        strFromU8(
          nativePackageResult.entries["ppt/slides/_rels/slide1.xml.rels"]!,
        ).includes("comments") &&
          strFromU8(
            nativePackageResult.entries["ppt/slides/_rels/slide1.xml.rels"]!,
          ).includes("https://example.com/review"),
        "Package authoring should merge native comment and action relationships into slide rels",
      )
      assert(
        strFromU8(
          nativePackageResult.entries["ppt/slides/slide1.xml"]!,
        ).includes("Key points action overlay") &&
          strFromU8(
            nativePackageResult.entries["ppt/slides/slide1.xml"]!,
          ).includes("<p:timing>"),
        "Package authoring should append action overlays and replace slide timing XML",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "native-package-parts" && metric.value === "11/11",
        ),
        "PPTX preflight should expose composed native package part readiness",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "native-office-package-parity" &&
            metric.value === "3/4",
        ),
        "PPTX preflight should expose Native Office package parity readiness",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "master-layout-relationship-checks" &&
            metric.value === "5/5",
        ),
        "PPTX preflight should expose native master/layout relationship checks",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "theme-application-path" && metric.value === "ready",
        ),
        "PPTX preflight should expose reusable theme application path readiness",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "native-package-merge-parts" && metric.value === "6",
        ),
        "PPTX preflight should expose merge-sensitive native package writes",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "placeholder-inheritance" && metric.value === "4/4",
        ),
        "PPTX preflight should expose placeholder inheritance diagnostics",
      )
      assert(
        xmlPlanText.includes("Native PPTX master XML plan") &&
          xmlPlanText.includes("ppt/theme/theme1.xml") &&
          xmlPlanText.includes("Authoring tasks: 10/10") &&
          xmlPlanText.includes("ppt/slideLayouts/slideLayout1.xml"),
        "Serialized native master XML plan should include package part paths",
      )
      assert(
        authoringPlanText.includes("Native master/layout XML authoring plan") &&
          authoringPlanText.includes("ppt/slideMasters/slideMaster1.xml") &&
          authoringPlanText.includes("8,10,80,12"),
        "Serialized authoring plan should include master paths and placeholder geometry",
      )
      assert(
        masterLayoutXmlText.includes("Native master/layout XML authoring") &&
          masterLayoutXmlText.includes("ppt/slideMasters/slideMaster1.xml") &&
          masterLayoutXmlText.includes("ppt/slideLayouts/slideLayout1.xml"),
        "Serialized master/layout XML authoring should include authored package part paths",
      )
      assert(
        themePackageText.includes("Office theme package plan") &&
          themePackageText.includes("apex.thmx") &&
          themePackageText.includes("ppt/theme/theme1.xml"),
        "Serialized theme package plan should include the reusable package filename and theme XML path",
      )
      assert(
        themePackageXmlText.includes("Office theme package XML authoring") &&
          themePackageXmlText.includes("apex.thmx") &&
          themePackageXmlText.includes("ppt/theme/theme1.xml"),
        "Serialized theme package XML authoring should include package filenames and XML part paths",
      )
      assert(
        themeVariantRepairText.includes("Office theme variant repair report") &&
          themeVariantRepairText.includes("apex.thmx") &&
          themeVariantRepairText.includes("Variants:"),
        "Serialized theme variant repair report should include package and variant review details",
      )
      assert(
        nativePackageText.includes("Native PPTX package authoring") &&
          nativePackageText.includes("replace-slide-timing") &&
          nativePackageText.includes("ppt/comments/comment1.xml"),
        "Serialized native package authoring should include write strategies and package paths",
      )
      assert(
        nativeOfficeParityText.includes("Native Office package parity report") &&
          nativeOfficeParityText.includes("apex.thmx") &&
          nativeOfficeParityText.includes(
            "ppt/slideMasters/_rels/slideMaster1.xml.rels",
          ),
        "Serialized Native Office parity report should include theme package and relationship paths",
      )
      assert(
        !report.issues.some((issue) => issue.id === "master-layouts"),
        "Fully mapped placeholder layouts should not create layout handoff warnings",
      )
    },
  },
  {
    name: "office theme metadata round-trips through master safeguards and PPTX export",
    async run() {
      const themeXml = `<?xml version="1.0" encoding="UTF-8"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Apex">
  <a:themeElements>
    <a:clrScheme name="Apex Colors">
      <a:dk1><a:srgbClr val="111827"/></a:dk1>
      <a:lt1><a:srgbClr val="F8FAFC"/></a:lt1>
      <a:accent1><a:srgbClr val="2563EB"/></a:accent1>
      <a:accent2><a:sysClr val="windowText" lastClr="16A34A"/></a:accent2>
    </a:clrScheme>
    <a:fontScheme name="Apex Fonts">
      <a:majorFont><a:latin typeface="Aptos Display"/></a:majorFont>
      <a:minorFont><a:latin typeface="Aptos"/></a:minorFont>
    </a:fontScheme>
  </a:themeElements>
</a:theme>`
      const officeTheme = officeThemeMetadataFromPptxThemeXml(themeXml, {
        importedAt: "2026-05-15T00:00:00.000Z",
        placeholderDefaultCount: 7,
        slideLayoutCount: 3,
        slideMasterCount: 1,
      })

      assert(officeTheme, "PPTX theme XML should produce Office theme metadata")
      assertEqual(officeTheme.name, "Apex", "Theme name should be preserved")
      assertEqual(
        officeTheme.colorSchemeName,
        "Apex Colors",
        "Color scheme name should be preserved",
      )
      assertEqual(
        officeTheme.colors.length,
        4,
        "Theme color slots should be preserved",
      )
      assertEqual(
        officeTheme.colors[3]?.color,
        "#16A34A",
        "System color fallbacks should preserve their last color",
      )
      assertEqual(
        officeTheme.majorFont,
        "Aptos Display",
        "Major theme font should be preserved",
      )
      assertEqual(
        officeTheme.minorFont,
        "Aptos",
        "Minor theme font should be preserved",
      )
      assertEqual(
        normalizeOfficeThemeMetadata({}),
        null,
        "Empty theme metadata should not become a fake Office theme",
      )

      const fontFaces = officeThemePptxFontFaces(officeTheme)
      const deck = createDefaultDeck()
      const themedDeck = {
        ...deck,
        master: {
          ...deck.master,
          officeTheme,
        },
      } satisfies Deck
      const report = masterThemeSafeguardReport(themedDeck)
      const blob = await exportDeckToPptxBlob(themedDeck)
      const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()))
      const exportedThemeXml = entries["ppt/theme/theme1.xml"]

      assertEqual(
        fontFaces.headFontFace,
        "Aptos Display",
        "PPTX export should prefer the imported major Office font",
      )
      assertEqual(
        fontFaces.bodyFontFace,
        "Aptos",
        "PPTX export should prefer the imported minor Office font",
      )
      assertEqual(
        report.metrics.officeThemeMetadataReady,
        true,
        "Safeguard report should mark complete Office theme metadata ready",
      )
      assertEqual(
        report.metrics.officeThemeColorCount,
        4,
        "Safeguard report should expose imported Office color coverage",
      )
      assertEqual(
        report.metrics.officeThemePlaceholderDefaultCount,
        7,
        "Safeguard report should expose imported placeholder default coverage",
      )
      assert(exportedThemeXml, "PPTX export should include theme XML")
      assert(
        strFromU8(exportedThemeXml).includes('typeface="Aptos Display"') &&
          strFromU8(exportedThemeXml).includes('typeface="Aptos"'),
        "PPTX export should write imported Office theme font faces",
      )
    },
  },
  {
    name: "cloud deck browser filters, sorts, and separates pinned decks",
    run() {
      const decks: CloudDeckSummary[] = [
        {
          id: "deck-a",
          accessRole: "owner",
          ownerName: null,
          title: "Quarterly Plan",
          theme: "studio",
          slideCount: 4,
          updatedAt: "2026-05-10T10:00:00.000Z",
        },
        {
          id: "deck-b",
          accessRole: "editor",
          ownerName: "Mira Stone",
          title: "Roadshow",
          theme: "signal",
          slideCount: 12,
          updatedAt: "2026-05-12T10:00:00.000Z",
        },
        {
          id: "deck-c",
          accessRole: "viewer",
          ownerName: "Ari Vale",
          title: "Tiny Notes",
          theme: "paper",
          slideCount: 2,
          updatedAt: "2026-05-11T10:00:00.000Z",
        },
      ]
      const organized = organizeCloudDecks({
        decks,
        pinnedDeckIds: ["deck-b"],
        query: "slides",
        sort: "slides-desc",
      })

      assertEqual(organized.resultCount, 3, "Slide-count query should match all deck summaries")
      assertEqual(organized.pinnedDecks[0]?.id, "deck-b", "Pinned deck should be separated")
      assertEqual(organized.otherDecks[0]?.id, "deck-a", "Remaining decks should keep slide-count order")
    },
  },
  {
    name: "cloud backstage shortcut readiness reports sign-in and tracking state",
    run() {
      const decks: CloudDeckSummary[] = [
        {
          id: "deck-a",
          accessRole: "owner",
          ownerName: null,
          title: "Quarterly Plan",
          theme: "studio",
          slideCount: 4,
          updatedAt: "2026-05-10T10:00:00.000Z",
        },
        {
          id: "deck-b",
          accessRole: "editor",
          ownerName: "Mira Stone",
          title: "Roadshow",
          theme: "signal",
          slideCount: 12,
          updatedAt: "2026-05-12T10:00:00.000Z",
        },
      ]
      const signedOut = cloudDeckShortcutReadiness({
        currentDeckId: "deck-a",
        pinnedDeckIds: ["deck-a"],
        recentDecks: decks,
        signedIn: false,
      })
      const ready = cloudDeckShortcutReadiness({
        currentDeckId: "deck-b",
        pinnedDeckIds: ["deck-a", "missing"],
        recentDecks: decks,
        signedIn: true,
      })

      assertEqual(
        signedOut.state,
        "signed-out",
        "Cloud backstage shortcuts should require sign-in before opening",
      )
      assertEqual(
        ready.state,
        "ready",
        "Signed-in cloud shortcuts with recents should be ready",
      )
      assertEqual(
        ready.currentDeckTracked,
        true,
        "Backstage cloud readiness should report whether the current deck is recent",
      )
      assertEqual(
        ready.pinnedCount,
        1,
        "Backstage cloud readiness should count only visible pinned shortcuts",
      )
    },
  },
  {
    name: "cloud sync browser e2e contract covers critical conflict selectors",
    run() {
      const contract = validateCloudSyncE2eContract()

      assertEqual(contract.valid, true, "Cloud sync e2e selector contract should be valid")
      assertEqual(contract.flowCount, 5, "Cloud sync contract should cover five browser flows")
      assert(
        contract.stepCount >= 25,
        "Cloud sync contract should cover enough browser steps",
      )
      assertArrayEqual(
        contract.duplicateTestIds,
        [],
        "Cloud sync test ids should be unique",
      )
      assertArrayEqual(
        contract.missingTestIds,
        [],
        "Cloud sync flow selectors should all exist",
      )
      assertArrayEqual(
        contract.uncoveredCriticalTestIds,
        [],
        "Critical cloud sync selectors should be referenced by browser flows",
      )
      assert(
        cloudSyncE2eFlows.every((flow) => flow.steps.length > 1),
        "Cloud sync browser flows should include actionable steps",
      )
    },
  },
  {
    name: "presentation browser smoke contract covers production surfaces",
    async run() {
      const contract = validatePresentationBrowserSmokeContract()
      const readiness = presentationBrowserSmokeReadinessReport()
      const liveReadiness = presentationBrowserSmokeReadinessReport({
        appUrl: "https://example.com",
        flowId: "desktop-local-file-status",
        requireUrl: true,
        timeoutMs: "5000",
      })
      const brokenReadiness = presentationBrowserSmokeReadinessReport({
        appUrl: "not-a-url",
        flowId: "missing-flow",
        requireUrl: true,
        timeoutMs: "-1",
      })
      const smokeExecution = presentationSmokeExecutionReadinessReport({
        appUrl: "https://example.com",
        fixtureDeckId: "fixture-quarterly-review",
        fixtureMode: "mutation-safe",
        flowId: "share-link-download-permissions",
        requireMutationSafeFixture: true,
        requireSeededCredentials: true,
        requireUrl: true,
        seededEmail: "admin@mail.com",
        seededPassword: "password",
        timeoutMs: "5000",
      })
      const broadSmokeExecution = presentationSmokeExecutionReadinessReport()
      const brokenSmokeExecution = presentationSmokeExecutionReadinessReport({
        appUrl: "not-a-url",
        flowId: "missing-flow",
        requireMutationSafeFixture: true,
        requireSeededCredentials: true,
        requireUrl: true,
        seededEmail: "not-an-email",
        timeoutMs: "0",
      })
      const smokeExecutionText =
        serializePresentationSmokeExecutionReadinessReport(smokeExecution)
      const smokeRunnerBridge = presentationSmokeRunnerBridgeReport({
        allowBrowserExecution: true,
        appUrl: "https://example.com",
        approvalPhrase: "RUN_PRESENTATION_SMOKE",
        browserHandoffMode: "playwright",
        fixtureDeckId: "fixture-quarterly-review",
        fixtureMode: "mutation-safe",
        flowIds: ["share-link-download-permissions"],
        storageStatePath: "storage-state.json",
        storageStateText: JSON.stringify({ cookies: [], origins: [] }),
        timeoutMs: "5000",
      })
      const blockedSmokeRunnerBridge = presentationSmokeRunnerBridgeReport({
        appUrl: "not-a-url",
        browserHandoffMode: "disabled",
        fixtureMode: "read-only",
        flowIds: ["missing-flow"],
        storageStatePath: "missing-storage-state.json",
        storageStateText: "{}",
        timeoutMs: "0",
      })
      const smokeRunnerBridgeText =
        serializePresentationSmokeRunnerBridgeReport(smokeRunnerBridge)
      const workspaceSmokeFlow = selectedPresentationBrowserSmokeFlows([
        "responsive-workspace-ergonomics",
      ])[0]
      const smokeRunnerSteps: string[] = []
      const smokeRunnerDriver: PresentationSmokeDriver = {
        click(testId) {
          smokeRunnerSteps.push(`click:${testId}`)
        },
        expectDisabled(testId) {
          smokeRunnerSteps.push(`expect-disabled:${testId}`)
        },
        expectHidden(testId) {
          smokeRunnerSteps.push(`expect-hidden:${testId}`)
        },
        expectVisible(testId) {
          smokeRunnerSteps.push(`expect-visible:${testId}`)
        },
        fill(testId, value) {
          smokeRunnerSteps.push(`fill:${testId}:${value}`)
        },
      }
      assert(workspaceSmokeFlow, "Workspace smoke flow should be selectable")
      const smokeRunnerResult = await runPresentationBrowserSmokeFlow(
        workspaceSmokeFlow,
        {
          driver: smokeRunnerDriver,
        },
      )
      const defaultProductionReadiness = presentationProductionReadinessReport({
        deck: createDefaultDeck(),
      })
      const commandDeck = createDefaultDeck()
      const commandActions = presentationCommandPaletteActions({
        canGroupSelected: true,
        canUngroupSelected: false,
        copiedElementsCount: 1,
        copiedSlidesCount: 0,
        futureCount: 1,
        historyCount: 1,
        selectedEditableElementCount: 2,
        selectedElementCount: 2,
        selectedSlideId: commandDeck.slides[0]?.id ?? "",
        selectedSlideIds: commandDeck.slides[0]?.id
          ? [commandDeck.slides[0].id]
          : [],
        showGrid: false,
        showRulers: true,
        slideCount: commandDeck.slides.length,
        slides: commandDeck.slides.map((slide) => ({
          id: slide.id,
          title: slide.title,
        })),
        workspaceDensity: "compact",
        workspacePanels: {
          filmstripOpen: false,
          propertiesOpen: true,
        },
        zoom: 88,
      })
      const commandChartResults = filterPresentationCommandPaletteActions(
        commandActions,
        "chart",
      )
      const commandSlideResults = filterPresentationCommandPaletteActions(
        commandActions,
        "slide 2",
      )
      const releaseEnvironment = releaseEnvironmentReadinessReport({
        adminEmail: "admin@mail.com",
        adminPassword: "release-password-123",
        betterAuthSecret: "a".repeat(40),
        betterAuthUrl: "https://example.com",
        brevoApiKey: "release-email-provider-token",
        brevoSenderEmail: "ajju40959@gmail.com",
        productionUrl: "https://example.com",
        requireHostedDatabase: true,
        requireProductionSecrets: true,
        tursoAuthToken: "release-token",
        tursoDatabaseUrl: "libsql://essence-powerpoint.turso.io",
        vercelOrgId: "team_123",
        vercelProjectId: "prj_123",
        vercelProjectName: "essence-powerpoint",
      })
      const brokenReleaseEnvironment = releaseEnvironmentReadinessReport({
        adminEmail: "not-an-email",
        adminPassword: "password",
        betterAuthSecret: "replace-with-a-strong-random-secret",
        betterAuthUrl: "http://localhost:3000",
        brevoSenderEmail: "sender",
        requireHostedDatabase: true,
        requireProductionSecrets: true,
        tursoDatabaseUrl: "file:local.db",
      })
      const releaseEnvironmentText =
        serializeReleaseEnvironmentReadinessReport(releaseEnvironment)
      const releaseBridge = desktopBridgeReadinessFromCapabilities({
        clipboard: true,
        desktopShell: true,
        fileOpen: true,
        fileSave: true,
        persistentHandles: true,
        recoveryStorage: true,
      })
      const releaseDesktopPackaging = desktopPackagingReadinessReport(
        releaseBridge,
        {
          packaging: {
            appIdentifier: "app.essence.powerpoint",
            bundleTargets: ["all"],
            codeSigningIdentity: "Developer ID Application: Essence",
            notarizationProfile: "notarytool-profile",
            productName: "Essence PowerPoint",
            version: "0.1.0",
          },
          recentFiles: [
            {
              id: "release-fresh",
              lastModified: Date.parse("2026-05-16T00:00:00.000Z"),
              lastOpenedAt: Date.parse("2026-05-16T00:00:00.000Z"),
              name: "release.essdeck",
              nativePath: "C:\\Decks\\release.essdeck",
              pinned: false,
              size: 1200,
            },
          ],
          runtime: { canExportSelectedSlide: true },
        },
      )
      const releaseDesktopRegistration = desktopReleaseRegistrationReport({
        fileAssociations: [...desktopReleaseFileAssociations],
        hasNativeRecentPathMetadata: true,
        hasNotarizationInputs: true,
        hasOsRecentDocumentWriter: true,
        hasSigningInputs: true,
        recentDocumentWriterCommandCount:
          releaseDesktopPackaging.recentDocuments.writerCommandCount,
        releaseGates: [...desktopReleaseGates],
      })
      const releaseDeck = createDefaultDeck()
      const releaseExportedDeck = { deck: releaseDeck, version: 1 as const }
      const releaseLocalSession = localDeckFileSessionFromExportedDeck({
        exportedDeck: releaseExportedDeck,
        fileName: "release.essdeck",
        now: new Date("2026-05-16T01:00:00.000Z"),
        writable: true,
      })
      const desktopDiagnostics = desktopLocalFileDiagnosticsReport({
        currentFileSession: releaseLocalSession,
        currentFileStatus: localDeckFileStatus({
          current: releaseExportedDeck,
          session: releaseLocalSession,
        }),
        nativeCapabilities: {
          maxFileBytes: 50 * 1024 * 1024,
          scopes: [
            {
              acceptExtensions: [".essdeck", ".json"],
              canRead: true,
              canWrite: false,
              permissionScope: "read-deck-file",
            },
            {
              acceptExtensions: [".essdeck", ".json"],
              canRead: false,
              canWrite: true,
              permissionScope: "write-deck-file",
            },
            {
              acceptExtensions: [".pptx", ".odp"],
              canRead: true,
              canWrite: false,
              permissionScope: "read-presentation-file",
            },
            {
              acceptExtensions: [".pptx", ".pdf", ".svg", ".png"],
              canRead: false,
              canWrite: true,
              permissionScope: "write-export-file",
            },
          ],
        },
        readiness: releaseBridge,
        recentFiles: [
          {
            id: "release-fresh",
            lastModified: Date.parse("2026-05-16T00:00:00.000Z"),
            lastOpenedAt: Date.parse("2026-05-16T00:00:00.000Z"),
            name: "release.essdeck",
            nativePath: "C:\\Decks\\release.essdeck",
            pinned: true,
            size: 1200,
          },
        ],
        runtime: { canExportSelectedSlide: true },
      })
      const brokenDesktopDiagnostics = desktopLocalFileDiagnosticsReport({
        currentFileStatus: localDeckFileStatus({
          current: releaseExportedDeck,
          session: null,
        }),
        nativeCapabilities: { maxFileBytes: 1, scopes: [] },
        readiness: desktopBridgeReadinessFromCapabilities({}),
      })
      const smokeFixtureLifecycle = smokeFixtureLifecyclePlan({
        appUrl: "https://example.com",
        browserHandoffMode: "disabled",
        fixtureDeckId: "fixture-quarterly-review",
        fixtureMode: "mutation-safe",
        resetRevisionId: "revision-baseline",
        seededEmail: "admin@mail.com",
        seededPassword: "password",
        sessionStatePath: "storage-state.json",
      })
      const smokeFixtureList = smokeFixtureLifecycle.fixtures
      const smokeFixtures = smokeFixtureLifecycle.readiness
      const smokeExecutionPlan = smokeFixtureLifecycle.executionPlan
      const smokeFixtureLifecycleText =
        serializeSmokeFixtureLifecyclePlan(smokeFixtureLifecycle)
      const smokeFixtureLifecycleJson = JSON.parse(
        serializeSmokeFixtureLifecyclePlanJson(smokeFixtureLifecycle),
      ) as { status?: string; commands?: Array<{ id?: string }> }
      const brokenSmokeFixtureLifecycle = smokeFixtureLifecyclePlan({
        browserHandoffMode: "playwright",
        fixtureMode: "mutation-safe",
        flowIds: ["share-link-download-permissions"],
      })
      const executableSmokeExecutionPlan = smokeFixtureExecutionPlanReport({
        allowBrowserExecution: true,
        appUrl: "https://example.com",
        browserHandoffMode: "playwright",
        fixtures: smokeFixtureList,
        flowIds: ["share-link-download-permissions"],
        seededEmail: "admin@mail.com",
        seededPassword: "password",
        sessionStatePath: "storage-state.json",
      })
      const brokenSmokeExecutionPlan = smokeFixtureExecutionPlanReport({
        browserHandoffMode: "playwright",
        fixtures: [
          {
            flowId: "share-link-download-permissions",
            id: "unsafe-share",
            label: "Unsafe share fixture",
            mode: "read-only",
          },
        ],
        flowIds: ["share-link-download-permissions", "missing-flow"],
      })
      const brokenSmokeFixtures = smokeFixtureReadinessReport({
        fixtures: [
          {
            flowId: "missing-flow",
            id: "broken-flow",
            label: "Broken flow",
            mode: "read-only",
          },
        ],
      })
      const cloudData = cloudDataHealthReport({
        activeSessions: 1,
        admins: 1,
        bannedAdmins: 0,
        credentialAccounts: 2,
        databaseReachable: true,
        decks: 2,
        decksWithoutSlides: 0,
        enabledShares: 1,
        expiredEnabledShares: 0,
        orphanCollaborators: 0,
        orphanDecks: 0,
        pendingInvites: 1,
        revisions: 2,
        slides: 4,
        users: 2,
        verifiedAdmins: 1,
        verifiedUsers: 2,
      })
      const brokenCloudData = cloudDataHealthReport({
        databaseError: "missing table",
        databaseReachable: false,
      })
      const dataOperations = productionDataOperationsReport({
        admins: 1,
        credentialAccounts: 2,
        databaseAssetBytes: 1000,
        databaseAssets: 2,
        databaseReachable: true,
        deckAssets: 2,
        decks: 2,
        decksWithoutSlides: 0,
        enabledShares: 1,
        expiredEnabledShares: 0,
        expiredSessions: 0,
        objectStorageEnabled: true,
        objectStorageMinBytes: 512 * 1024,
        objectStorageProvider: "s3",
        orphanCollaborators: 0,
        orphanDecks: 0,
        oversizedDatabaseAssets: 0,
        pendingInvites: 1,
        remoteAssets: 1,
        remoteAssetsMissingKeys: 0,
        remoteAssetsWithInlinePayload: 0,
        revisions: 2,
        revisionsPastRetention: 0,
        staleShareViews: 0,
        verifiedAdmins: 1,
      })
      const brokenDataOperations = productionDataOperationsReport({
        admins: 0,
        credentialAccounts: 0,
        databaseReachable: true,
        decks: 1,
        decksWithoutSlides: 1,
        expiredEnabledShares: 2,
        expiredSessions: 3,
        orphanCollaborators: 1,
        orphanDecks: 1,
        oversizedDatabaseAssets: 1,
        remoteAssetsMissingKeys: 1,
        revisions: 0,
        revisionsPastRetention: 2,
        staleShareViews: 4,
        verifiedAdmins: 0,
      })
      const dataOperationsText =
        serializeProductionDataOperationsReport(dataOperations)
      const productionHealth = productionReadinessHealthReport({
        cloudData,
        dataOperations,
        desktopLocalFiles: desktopDiagnostics,
        generatedAt: "2026-05-16T01:00:00.000Z",
        smokeExecutionPlan,
        smokeFixtureLifecycle,
        smokeFixtures,
      })
      const productionHealthText =
        serializeProductionReadinessHealthReport(productionHealth)
      const productionHealthJson = JSON.parse(
        serializeProductionReadinessHealthJson(productionHealth),
      ) as { status?: string; sections?: Array<{ id?: string }> }
      const releaseHandoff = releaseAutomationHandoffReport({
        cloudSyncReadiness: cloudSyncE2eReadinessReport({
          appUrl: "https://example.com",
          flowId: "open-cloud-deck-from-browser",
          requireUrl: true,
        }),
        desktopPackaging: releaseDesktopPackaging,
        desktopRegistration: releaseDesktopRegistration,
        environment: releaseEnvironment,
        generatedAt: "2026-05-16T01:00:00.000Z",
        smokeExecution,
        smokeExecutionPlan,
        smokeFixtureLifecycle,
        target: "https://example.com",
      })
      const releaseHandoffText =
        serializeReleaseAutomationHandoffReport(releaseHandoff)
      const releaseHandoffJson = JSON.parse(
        serializeReleaseAutomationHandoffJson(releaseHandoff),
      ) as { status?: string; target?: string }

      assertEqual(
        contract.valid,
        true,
        "Presentation smoke contract should validate cloud, auth, share, Backstage, desktop, and performance surfaces",
      )
      assertEqual(
        contract.flowCount,
        13,
        "Presentation smoke contract should include cloud flows plus eight product-readiness flows",
      )
      assert(
        contract.stepCount > 55,
        "Presentation smoke contract should cover broad low-cost browser steps",
      )
      assertArrayEqual(
        contract.uncoveredCriticalTestIds,
        [],
        "Critical production smoke ids should be referenced by browser flows",
      )
      assert(
        presentationBrowserSmokeFlows.some(
          (flow) => flow.id === "backstage-export-preflight",
        ),
        "Smoke flows should cover Backstage export preflight",
      )
      assert(
        presentationBrowserSmokeFlows
          .find((flow) => flow.id === "backstage-export-preflight")
          ?.steps.some(
            (step) =>
              step.testId === presentationSmokeTestIds.exportRepairLoopPanel,
          ),
        "Backstage export smoke flow should cover the import/export repair loop panel",
      )
      assert(
        presentationBrowserSmokeFlows.some(
          (flow) => flow.id === "backstage-recovery-info-readiness",
        ),
        "Smoke flows should cover Backstage recovery and document info tabs",
      )
      assert(
        presentationBrowserSmokeFlows.some(
          (flow) => flow.id === "auth-email-password-entry",
        ),
        "Smoke flows should cover email and password auth controls",
      )
      assert(
        presentationBrowserSmokeFlows.some(
          (flow) => flow.id === "share-link-download-permissions",
        ),
        "Smoke flows should cover share-link download permission controls",
      )
      assert(
        presentationBrowserSmokeFlows.some(
          (flow) => flow.id === "desktop-local-file-status",
        ),
        "Smoke flows should cover desktop local file status",
      )
      assert(
        presentationBrowserSmokeFlows.some(
          (flow) => flow.id === "large-deck-status-pressure",
        ),
        "Smoke flows should cover status-bar performance pressure",
      )
      assert(
        presentationBrowserSmokeFlows.some(
          (flow) => flow.id === "app-shell-command-palette",
        ),
        "Smoke flows should cover the app-shell command palette",
      )
      assert(
        presentationBrowserSmokeFlows.some(
          (flow) => flow.id === "responsive-workspace-ergonomics",
        ),
        "Smoke flows should cover responsive workspace controls",
      )
      assert(
        Object.values(presentationSmokeTestIds).includes(
          presentationSmokeTestIds.commandPaletteTrigger,
        ) &&
          Object.values(presentationSmokeTestIds).includes(
            presentationSmokeTestIds.commandPaletteSearch,
        ),
        "Command palette smoke ids should be registered",
      )
      assert(
        Object.values(presentationSmokeTestIds).includes(
          presentationSmokeTestIds.workspaceDensityControls,
        ) &&
          Object.values(presentationSmokeTestIds).includes(
            presentationSmokeTestIds.workspaceFilmstripToggle,
          ) &&
          Object.values(presentationSmokeTestIds).includes(
            presentationSmokeTestIds.workspacePropertiesPanel,
          ),
        "Workspace ergonomics smoke ids should be registered",
      )
      assert(
        Object.values(presentationSmokeTestIds).includes(
          presentationSmokeTestIds.exportRepairLoopCopyButton,
        ) &&
          Object.values(presentationSmokeTestIds).includes(
            presentationSmokeTestIds.exportRepairLoopDownloadButton,
          ) &&
          Object.values(presentationSmokeTestIds).includes(
            presentationSmokeTestIds.exportRepairLoopAction,
          ),
        "Import/export repair loop smoke ids should be registered",
      )
      assert(
        commandActions.some((action) => action.id === "insert.chart") &&
          commandActions.some((action) => action.id === "object.group") &&
          commandActions.some((action) => action.id === "view.toggle-grid") &&
          commandActions.some((action) => action.id === "view.toggle-filmstrip") &&
          commandActions.some((action) => action.id === "view.density.focus"),
        "Command palette should include real insert, object, and view commands",
      )
      assert(
        commandActions.some(
          (action) => action.id === "view.density.compact" && action.disabled,
        ),
        "Command palette should mark the active workspace density as disabled",
      )
      assert(
        commandActions.some(
          (action) => action.id === "edit.paste-slides" && action.disabled,
        ),
        "Command palette should keep commands disabled when their prerequisites are missing",
      )
      assert(
        commandChartResults.some((action) => action.id === "insert.chart"),
        "Command palette search should find insert commands by query",
      )
      assert(
        commandSlideResults.some((action) =>
          action.id.startsWith("slide.select:"),
        ),
        "Command palette search should find slide navigation commands by title or number",
      )
      assert(
        contract.missingTestIds.length === 0,
        "Smoke flow selectors should all exist in the registered test id sets",
      )
      assertEqual(
        readiness.status,
        "warn",
        "Credential-free smoke readiness should warn without a live app URL",
      )
      assertEqual(
        readiness.failedCount,
        0,
        "Credential-free smoke readiness should not fail static selector validation",
      )
      assertEqual(
        liveReadiness.status,
        "pass",
        "Live presentation smoke readiness should pass with a valid URL and flow",
      )
      assertEqual(
        liveReadiness.selectedFlowCount,
        1,
        "Live smoke readiness should select the requested flow",
      )
      assertEqual(
        brokenReadiness.status,
        "fail",
        "Invalid presentation smoke options should fail readiness",
      )
      assert(
        brokenReadiness.failedCount >= 3,
        "Broken smoke readiness should report flow, URL, and timeout failures",
      )
      assert(
        Object.values(presentationSmokeTestIds).includes(
          presentationSmokeTestIds.desktopPackagingPanel,
        ),
        "Desktop packaging smoke id should be registered",
      )
      assert(
        Object.values(presentationSmokeTestIds).includes(
          presentationSmokeTestIds.desktopReleasePanel,
        ),
        "Desktop release smoke id should be registered",
      )
      assert(
        presentationBrowserSmokeFlows
          .find((flow) => flow.id === "desktop-local-file-status")
          ?.steps.some(
            (step) => step.testId === presentationSmokeTestIds.desktopReleasePanel,
          ),
        "Desktop smoke flow should cover release registration diagnostics",
      )
      assert(
        Object.values(presentationSmokeTestIds).includes(
          presentationSmokeTestIds.shareDownloadPermissionToggle,
        ),
        "Share download permission smoke id should be registered",
      )
      assertEqual(
        defaultProductionReadiness.status,
        "watch",
        "Production readiness should watch missing live smoke URL while performance is ready",
      )
      assertEqual(
        smokeExecution.status,
        "pass",
        "Prepared live smoke execution should pass with seeded credentials and mutation-safe fixtures",
      )
      assertEqual(
        smokeExecution.selectedFlowCount,
        1,
        "Smoke execution readiness should support targeted flow selection",
      )
      assertEqual(
        smokeRunnerBridge.canRun,
        true,
        "Smoke runner bridge should allow execution only after approval, URL, storage state, and mutation fixture gates pass",
      )
      assertEqual(
        smokeRunnerBridge.status,
        "ready",
        "Prepared smoke runner bridge should be ready",
      )
      assertEqual(
        blockedSmokeRunnerBridge.canRun,
        false,
        "Broken smoke runner bridge should refuse browser execution",
      )
      assertEqual(
        blockedSmokeRunnerBridge.status,
        "blocked",
        "Broken smoke runner bridge should block invalid URL, storage state, fixture, approval, and handoff mode",
      )
      assert(
        smokeRunnerBridgeText.includes("test:presentation-smoke:bridge") &&
          smokeRunnerBridgeText.includes("RUN_PRESENTATION_SMOKE"),
        "Smoke runner bridge serialization should include the guarded execution command",
      )
      assertEqual(
        smokeRunnerResult.stepCount,
        workspaceSmokeFlow.steps.length,
        "Presentation smoke runner should execute the selected flow step contract",
      )
      assertEqual(
        smokeRunnerSteps.length,
        workspaceSmokeFlow.steps.length,
        "Presentation smoke runner should call the driver once per smoke step",
      )
      assert(
        smokeExecution.checks.some(
          (check) =>
            check.id === "seeded-credentials" && check.status === "pass",
        ),
        "Smoke execution readiness should validate seeded credentials",
      )
      assert(
        smokeExecution.checks.some(
          (check) =>
            check.id === "mutation-safe-fixture" && check.status === "pass",
        ),
        "Smoke execution readiness should validate mutation-safe fixture coverage",
      )
      assertEqual(
        broadSmokeExecution.status,
        "warn",
        "Broad smoke execution readiness should warn when no live target or flow is selected",
      )
      assertEqual(
        brokenSmokeExecution.status,
        "fail",
        "Broken smoke execution readiness should fail invalid URL, flow, credentials, timeout, and fixture checks",
      )
      assert(
        smokeExecutionText.includes("Presentation smoke execution readiness") &&
          smokeExecutionText.includes("share-link-download-permissions") &&
          smokeExecutionText.includes("Fixture mode: mutation-safe"),
        "Smoke execution readiness serialization should be copyable for release reviews",
      )
      assertEqual(
        releaseEnvironment.status,
        "pass",
        "Complete Vercel, Turso, auth, and Brevo environment inputs should pass release readiness",
      )
      assertEqual(
        brokenReleaseEnvironment.status,
        "fail",
        "Production-strict release environment readiness should fail placeholders and local database settings",
      )
      assert(
        releaseEnvironmentText.includes("Release environment readiness") &&
          releaseEnvironmentText.includes("Turso database URL") &&
          releaseEnvironmentText.includes("Better Auth secret"),
        "Release environment readiness should serialize CLI-readable auth and database checks",
      )
      assertEqual(
        releaseHandoff.status,
        "ready",
        "Release automation handoff should be ready when desktop, smoke, and environment checks pass",
      )
      assert(
        releaseHandoff.sections.some(
          (section) => section.id === "release-environment",
        ),
        "Release automation handoff should include the Vercel/Turso/auth environment section",
      )
      assert(
        releaseHandoffText.includes("Release automation handoff") &&
          releaseHandoffText.includes("bun run release:handoff") &&
          releaseHandoffText.includes("bun run production:fixtures") &&
          releaseHandoffText.includes("Smoke execution prerequisites") &&
          releaseHandoffText.includes("Smoke execution plan") &&
          releaseHandoffText.includes("Production fixture lifecycle"),
        "Release automation handoff should serialize a CLI-readable lightweight command plan",
      )
      assertEqual(
        releaseHandoffJson.status,
        "ready",
        "Release automation JSON artifact should preserve overall status",
      )
      assertEqual(
        releaseHandoffJson.target,
        "https://example.com",
        "Release automation JSON artifact should preserve release target",
      )
      assertEqual(
        desktopDiagnostics.status,
        "ready",
        "Desktop local diagnostics should pass when native scoped open/save permissions and fresh recents are ready",
      )
      assertEqual(
        brokenDesktopDiagnostics.status,
        "blocked",
        "Desktop local diagnostics should block when native scoped commands and permissions are unavailable",
      )
      assert(
        serializeDesktopLocalFileDiagnosticsReport(desktopDiagnostics).includes(
          "Native permission scopes",
        ),
        "Desktop diagnostics should serialize permission-scoped local save/open checks",
      )
      assertEqual(
        smokeFixtures.status,
        "ready",
        "Low-cost smoke fixtures should pass when required flows are targeted and mutation fixtures are resettable",
      )
      assertEqual(
        brokenSmokeFixtures.status,
        "blocked",
        "Smoke fixture readiness should block unknown flows",
      )
      assert(
        serializeSmokeFixtureReadinessReport(smokeFixtures).includes(
          "cloud-sync:inspect-manual-cloud-conflict",
        ),
        "Smoke fixture readiness should serialize targeted cloud fixture ids",
      )
      assertEqual(
        smokeExecutionPlan.status,
        "ready",
        "Smoke fixture execution plan should pass when deck factories, sessions, and disabled handoff are prepared",
      )
      assert(
        smokeExecutionPlan.targets.some(
          (target) =>
            target.flowId === "share-link-download-permissions" &&
            target.deckFactory === "revision-reset" &&
            target.sessionStrategy === "storage-state",
        ),
        "Smoke fixture execution plan should preserve mutation-safe deck factory and seeded session metadata",
      )
      assertEqual(
        executableSmokeExecutionPlan.status,
        "ready",
        "Explicitly allowed browser execution handoff should pass with a valid target URL",
      )
      assertEqual(
        brokenSmokeExecutionPlan.status,
        "blocked",
        "Smoke fixture execution plan should block unsafe mutation fixtures and unapproved browser handoff",
      )
      assert(
        serializeSmokeFixtureExecutionPlanReport(smokeExecutionPlan).includes(
          "Browser handoff: disabled",
        ),
        "Smoke fixture execution plan should serialize disabled-by-default browser handoff",
      )
      assertEqual(
        smokeFixtureLifecycle.status,
        "ready",
        "Production fixture lifecycle should pass with seeded session metadata and resettable mutation decks",
      )
      assert(
        smokeFixtureLifecycle.commands.some(
          (command) =>
            command.id === "reset-deck" &&
            command.status === "ready" &&
            command.command.includes("production:fixtures"),
        ),
        "Production fixture lifecycle should expose a reset-deck command for mutation-safe decks",
      )
      assertEqual(
        brokenSmokeFixtureLifecycle.status,
        "blocked",
        "Production fixture lifecycle should block mutation fixtures without deck reset metadata or browser approval",
      )
      assert(
        smokeFixtureLifecycleText.includes("Production fixture lifecycle") &&
          smokeFixtureLifecycleText.includes("Fixture mode: mutation-safe") &&
          smokeFixtureLifecycleText.includes("Browser handoff: disabled") &&
          smokeFixtureLifecycleText.includes("bun run production:fixtures") &&
          smokeFixtureLifecycleText.includes(
            "bun run test:presentation-smoke:bridge",
          ),
        "Production fixture lifecycle serialization should be copyable for release reviews",
      )
      assertEqual(
        smokeFixtureLifecycleJson.status,
        "ready",
        "Production fixture lifecycle JSON should preserve status",
      )
      assert(
        smokeFixtureLifecycleJson.commands?.some(
          (command) => command.id === "browser-handoff",
        ),
        "Production fixture lifecycle JSON should preserve command ids",
      )
      assertEqual(
        cloudData.status,
        "ready",
        "Admin/auth/deck data health should pass for verified admin, credential accounts, deck slides, revisions, and clean shares",
      )
      assertEqual(
        brokenCloudData.status,
        "blocked",
        "Admin/auth/deck data health should block when the database is unreachable",
      )
      assert(
        serializeCloudDataHealthReport(cloudData).includes("Credential auth"),
        "Cloud data health should serialize auth checks for release handoff",
      )
      assertEqual(
        dataOperations.status,
        "ready",
        "Production data operations should pass when admin fixture, deck fixture, share expiry, ownership, assets, and retention are clean",
      )
      assertEqual(
        brokenDataOperations.status,
        "blocked",
        "Production data operations should block on missing admin credentials, orphan records, or broken remote assets",
      )
      assert(
        dataOperations.operations.some(
          (operation) =>
            operation.id === "disable-expired-shares" &&
            operation.ownerVisible,
        ),
        "Production data operations should expose owner-visible share remediation rows",
      )
      assert(
        dataOperationsText.includes("Production data operations") &&
          dataOperationsText.includes("Asset storage hygiene"),
        "Production data operations should serialize copyable asset and cleanup runbooks",
      )
      assertEqual(
        productionHealth.status,
        "ready",
        "Combined production readiness health should pass when desktop, smoke fixture, and data health sections pass",
      )
      assert(
        productionHealth.sections.some(
          (section) => section.id === "cloud-data-health",
        ),
        "Production readiness health should include cloud data health as a first-class section",
      )
      assert(
        productionHealth.sections.some(
          (section) => section.id === "production-data-operations",
        ),
        "Production readiness health should include production data operations as a first-class section",
      )
      assert(
        productionHealth.sections.some(
          (section) => section.id === "smoke-execution-plan",
        ),
        "Production readiness health should include smoke execution planning as a first-class section",
      )
      assert(
        productionHealth.sections.some(
          (section) => section.id === "smoke-fixture-lifecycle",
        ),
        "Production readiness health should include smoke fixture lifecycle as a first-class section",
      )
      assert(
        productionHealthText.includes("Production readiness health") &&
          productionHealthText.includes("Desktop local files") &&
          productionHealthText.includes("Low-cost smoke fixtures") &&
          productionHealthText.includes("Smoke execution plan") &&
          productionHealthText.includes("Smoke fixture lifecycle") &&
          productionHealthText.includes("Data operations"),
        "Production readiness health should serialize a CLI-readable report",
      )
      assertEqual(
        productionHealthJson.status,
        "ready",
        "Production readiness health JSON should preserve status",
      )
      assert(
        productionHealthJson.sections?.some(
          (section) => section.id === "desktop-local-files",
        ),
        "Production readiness health JSON should preserve section ids",
      )
    },
  },
  {
    name: "cloud sync e2e runner executes browser flow steps in order",
    async run() {
      const [flow] = cloudSyncE2eFlows
      const calls: string[] = []

      assert(flow, "Cloud sync e2e flows should include an opening flow")

      const result = await runCloudSyncE2eFlow(flow, {
        driver: {
          click(testId) {
            calls.push(`click:${testId}`)
          },
          expectDisabled(testId) {
            calls.push(`disabled:${testId}`)
          },
          expectHidden(testId) {
            calls.push(`hidden:${testId}`)
          },
          expectVisible(testId) {
            calls.push(`visible:${testId}`)
          },
          fill(testId, value) {
            calls.push(`fill:${testId}:${value}`)
          },
        },
        fillValues: {
          [cloudSyncTestIds.searchInput]: "Roadshow",
        },
      })

      assertEqual(result.flowId, flow.id, "Runner should report the executed flow id")
      assertEqual(
        result.stepCount,
        flow.steps.length,
        "Runner should report the executed step count",
      )
      assertArrayEqual(
        calls,
        [
          `click:${cloudSyncTestIds.openDialogButton}`,
          `visible:${cloudSyncTestIds.dialog}`,
          `click:${cloudSyncTestIds.refreshButton}`,
          `fill:${cloudSyncTestIds.searchInput}:Roadshow`,
          `visible:${cloudSyncTestIds.deckRow}`,
          `click:${cloudSyncTestIds.deckOpenButton}`,
          `hidden:${cloudSyncTestIds.dialog}`,
        ],
        "Runner should execute the flow in contract order",
      )
      assertEqual(
        cloudSyncSelector(cloudSyncTestIds.deckRow),
        '[data-testid="cloud-sync-deck-row"]',
        "Selector helper should target data-testid attributes",
      )
    },
  },
  {
    name: "cloud sync locator driver maps browser operations to selectors",
    async run() {
      const calls: string[] = []
      const driver = createCloudSyncLocatorDriver(
        {
          locator(selector) {
            return {
              click() {
                calls.push(`click:${selector}`)
              },
              fill(value) {
                calls.push(`fill:${selector}:${value}`)
              },
              isDisabled() {
                calls.push(`disabled:${selector}`)
                return true
              },
              waitFor(options) {
                calls.push(`wait:${selector}:${options.state}:${options.timeout}`)
              },
            }
          },
        },
        { timeoutMs: 1234 },
      )

      await driver.expectVisible(cloudSyncTestIds.openDialogButton)
      await driver.click(cloudSyncTestIds.openDialogButton)
      await driver.fill(cloudSyncTestIds.searchInput, "Roadshow")
      await driver.expectDisabled(cloudSyncTestIds.mergeReviewDialogButton)
      await driver.expectHidden(cloudSyncTestIds.dialog)

      assertArrayEqual(
        calls,
        [
          `wait:${cloudSyncSelector(cloudSyncTestIds.openDialogButton)}:visible:1234`,
          `wait:${cloudSyncSelector(cloudSyncTestIds.openDialogButton)}:visible:1234`,
          `click:${cloudSyncSelector(cloudSyncTestIds.openDialogButton)}`,
          `wait:${cloudSyncSelector(cloudSyncTestIds.searchInput)}:visible:1234`,
          `fill:${cloudSyncSelector(cloudSyncTestIds.searchInput)}:Roadshow`,
          `wait:${cloudSyncSelector(cloudSyncTestIds.mergeReviewDialogButton)}:visible:1234`,
          `disabled:${cloudSyncSelector(cloudSyncTestIds.mergeReviewDialogButton)}`,
          `wait:${cloudSyncSelector(cloudSyncTestIds.dialog)}:hidden:1234`,
        ],
        "Locator driver should translate runner actions to browser selectors",
      )
    },
  },
  {
    name: "cloud sync e2e readiness validates always-on smoke prerequisites",
    run() {
      const pullRequestReport = cloudSyncE2eReadinessReport()

      assertEqual(
        pullRequestReport.status,
        "warn",
        "Readiness should allow credential-free CI while warning about missing app URL",
      )
      assertEqual(
        pullRequestReport.failedCount,
        0,
        "Credential-free readiness should not fail when flow contracts are valid",
      )
      assert(
        pullRequestReport.stepCount >= 30,
        "Readiness should cover the existing browser smoke flow steps",
      )

      const liveReport = cloudSyncE2eReadinessReport({
        appUrl: "https://example.com",
        flowId: "open-cloud-deck-from-browser",
        requireUrl: true,
        storageStatePath: "storage-state.json",
        storageStateText: JSON.stringify({ cookies: [], origins: [] }),
        timeoutMs: "7000",
      })

      assertEqual(liveReport.status, "pass", "Live smoke readiness should pass")
      assertEqual(
        liveReport.selectedFlowCount,
        1,
        "Readiness should narrow to the requested flow",
      )

      const brokenReport = cloudSyncE2eReadinessReport({
        appUrl: "not-a-url",
        flowId: "missing-flow",
        requireUrl: true,
        storageStateText: "{}",
        timeoutMs: "0",
      })

      assertEqual(
        brokenReport.status,
        "fail",
        "Invalid smoke settings should fail readiness",
      )
      assert(
        brokenReport.failedCount >= 4,
        "Readiness should report invalid flow, URL, timeout, and storage state",
      )
    },
  },
  {
    name: "deck conflict preview reports changed and one-sided slides",
    run() {
      const baseDeck = createDefaultDeck()
      const [firstSlide, secondSlide] = baseDeck.slides

      assert(firstSlide && secondSlide, "Default deck should include two slides")

      const localDeck: Deck = {
        ...baseDeck,
        title: "Local title",
        slides: [
          {
            ...firstSlide,
            title: "Changed locally",
          },
          secondSlide,
        ],
      }
      const cloudDeck: Deck = {
        ...baseDeck,
        title: "Cloud title",
        slides: [
          firstSlide,
          {
            ...secondSlide,
            id: "cloud-only-slide",
          },
        ],
      }
      const preview = compareDeckVersions(localDeck, cloudDeck)

      assertEqual(preview.changedSlides, 1, "Changed shared slide should be counted")
      assertEqual(preview.localOnlySlides, 1, "Local-only slide should be counted")
      assertEqual(preview.cloudOnlySlides, 1, "Cloud-only slide should be counted")
      assertEqual(preview.titleChanged, true, "Title conflict should be reported")
    },
  },
  ...mergeRegressionCases,
  {
    name: "deck payload validation sanitizes imported deck records",
    run() {
      const deck = createDefaultDeck()
      const [firstSlide] = deck.slides

      assert(firstSlide, "Default deck should include a first slide")

      const parsed = parseDeckPayload({
        deck: {
          ...deck,
          theme: "studio",
          master: {
            showFooter: true,
            footerText: "Footer",
            showDate: true,
            showSlideNumbers: true,
            color: "#475569",
            fontSize: 99,
            fontFamily: "bad-font",
          },
          assets: [
            {
              id: "asset-1",
              type: "image",
              name: "Remote",
              mimeType: "image/png",
              dataUrl: "",
              storage: "remote",
              remoteUrl: "https://example.com/a.png",
              sizeBytes: 100,
              createdAt: "",
            },
            {
              id: "",
              type: "image",
              dataUrl: "",
              remoteUrl: "",
            },
          ],
          slides: [
            {
              ...firstSlide,
              comments: [
                {
                  id: "comment-1",
                  body: "Review with @Ava",
                  authorName: "Essence",
                  targetElementId: "",
                  resolved: false,
                  createdAt: "",
                  updatedAt: "",
                  source: "pptx",
                  sourceCommentId: "root-1",
                  sourceParentCommentId: "parent-0",
                  sourceReplyDepth: 99,
                  sourceReplyToAuthorName: "Amina Reviewer",
                  sourceThreadId: "thread-1",
                },
              ],
              elements: [
                {
                  ...createElement("chart"),
                  id: "chart-1",
                  chartData: [
                    { label: "Huge", value: 999999999, color: "#111111" },
                  ],
                  animation: "bad-animation",
                  fontFamily: "bad-font",
                  placeholderRole: "bad-role",
                  imageOpacity: -20,
                },
                {
                  ...createElement("shape"),
                  id: "connector-1",
                  shapeKind: "elbowConnector",
                  shapeConnectorStartX: -20,
                  shapeConnectorStartY: 25,
                  shapeConnectorControlX: 44,
                  shapeConnectorControlY: 150,
                  shapeConnectorEndX: 120,
                  shapeConnectorEndY: 75,
                },
              ],
            },
          ],
        },
      })

      assert(parsed, "Valid-looking deck payload should parse")
      assertEqual(parsed.master.fontSize, 24, "Master font size should be clamped")
      assertEqual(
        parsed.master.fontFamily,
        "system",
        "Invalid master fonts should use the master default",
      )
      assertEqual(parsed.assets.length, 1, "Invalid asset records should be dropped")
      assertEqual(
        parsed.slides[0]?.comments[0]?.mentions[0],
        "ava",
        "Comment mentions should be extracted during validation",
      )
      assertEqual(
        parsed.slides[0]?.comments[0]?.sourceReplyDepth,
        12,
        "PPTX comment reply depth should be clamped during validation",
      )
      assertEqual(
        parsed.slides[0]?.comments[0]?.sourceParentCommentId,
        "parent-0",
        "PPTX comment parent metadata should survive validation",
      )
      assertEqual(
        parsed.slides[0]?.elements[0]?.animation,
        "none",
        "Unknown animations should be normalized",
      )
      assertEqual(
        parsed.slides[0]?.elements[0]?.fontFamily,
        "system",
        "Invalid body object fonts should use body defaults",
      )
      assertEqual(
        parsed.slides[0]?.elements[0]?.placeholderRole,
        "none",
        "Invalid placeholder roles should be cleared",
      )
      assertEqual(
        parsed.slides[0]?.elements[0]?.imageOpacity,
        0,
        "Image opacity should be clamped",
      )
      assertEqual(
        parsed.slides[0]?.elements[0]?.chartData[0]?.value,
        1_000_000,
        "Chart values should be clamped",
      )
      assertEqual(
        parsed.slides[0]?.elements[1]?.shapeConnectorStartX,
        0,
        "Connector start X should be clamped during validation",
      )
      assertEqual(
        parsed.slides[0]?.elements[1]?.shapeConnectorControlY,
        100,
        "Connector control Y should be clamped during validation",
      )
      assertEqual(
        parsed.slides[0]?.elements[1]?.shapeConnectorEndX,
        100,
        "Connector end X should be clamped during validation",
      )
    },
  },
  {
    name: "admin access policy separates unauthenticated, forbidden, and allowed users",
    run() {
      assertEqual(
        resolveAdminAccess({
          sessionUser: null,
          dbUser: null,
        }).status,
        401,
        "Missing session should be unauthenticated",
      )
      assertEqual(
        resolveAdminAccess({
          sessionUser: { id: "user-1" },
          dbUser: { id: "user-1", role: "user", banned: false },
        }).status,
        403,
        "Non-admin users should be forbidden",
      )
      assertEqual(
        resolveAdminAccess({
          sessionUser: { id: "admin-1" },
          dbUser: { id: "admin-1", role: "admin", banned: true },
        }).status,
        403,
        "Banned admins should be forbidden",
      )
      assertEqual(
        resolveAdminAccess({
          sessionUser: { id: "admin-1" },
          dbUser: { id: "admin-1", role: "admin", banned: false },
        }).status,
        200,
        "Active admins should be allowed",
      )
    },
  },
  {
    name: "admin user update policy blocks unsafe self-edits and builds safe patches",
    run() {
      assertEqual(
        resolveAdminUserUpdate({
          adminUserId: "admin-1",
          body: {},
          now: new Date("2026-05-14T00:00:00.000Z"),
        }).ok,
        false,
        "Missing target user should be rejected",
      )
      assertEqual(
        resolveAdminUserUpdate({
          adminUserId: "admin-1",
          body: { userId: "admin-1", role: "user" },
        }).ok,
        false,
        "Admins should not be able to demote themselves",
      )
      assertEqual(
        resolveAdminUserUpdate({
          adminUserId: "admin-1",
          body: { userId: "admin-1", banned: true },
        }).ok,
        false,
        "Admins should not be able to ban themselves",
      )

      const decision = resolveAdminUserUpdate({
        adminUserId: "admin-1",
        body: {
          userId: "user-1",
          role: "admin",
          emailVerified: true,
          banned: true,
        },
        now: new Date("2026-05-14T00:00:00.000Z"),
      })

      assert(decision.ok, "Valid admin update should be accepted")
      assertEqual(decision.userId, "user-1", "Target user id should be preserved")
      assertEqual(decision.patch.role, "admin", "Valid role should be patched")
      assertEqual(
        decision.patch.emailVerified,
        true,
        "Email verification patch should be preserved",
      )
      assertEqual(decision.patch.banned, true, "Ban patch should be preserved")
      assertEqual(
        decision.patch.banReason,
        "Disabled by admin",
        "Ban reason should be set",
      )
      assertEqual(decision.patch.banExpires, null, "Ban expiry should be cleared")
    },
  },
  {
    name: "deck access policy separates owner, editor, viewer, and anonymous operations",
    run() {
      assertEqual(
        resolveDeckActorRole({ ownerId: "owner-1", userId: "owner-1" }),
        "owner",
        "Deck owners should resolve to owner role",
      )
      assertEqual(
        resolveDeckActorRole({
          collaboratorRole: "editor",
          ownerId: "owner-1",
          userId: "user-2",
        }),
        "editor",
        "Editor collaborators should resolve to editor role",
      )
      assertEqual(
        resolveDeckActorRole({
          collaboratorRole: "viewer",
          ownerId: "owner-1",
          userId: "user-3",
        }),
        "viewer",
        "Viewer collaborators should resolve to viewer role",
      )
      assertEqual(
        resolveDeckActorRole({ ownerId: "owner-1", userId: "user-4" }),
        "none",
        "Authenticated non-collaborators should resolve to no access",
      )

      const ownerDelete = resolveDeckOperationAccess({
        operation: "delete",
        role: "owner",
      })
      assert(ownerDelete.ok, "Owners should be able to delete decks")
      assertEqual(ownerDelete.mode, "owner", "Owner delete should be an owner operation")

      const editorMerge = resolveDeckOperationAccess({
        operation: "merge",
        role: "editor",
      })
      assert(editorMerge.ok, "Editors should be able to merge deck changes")
      assertEqual(editorMerge.mode, "write", "Editor merge should be a write operation")

      const editorShare = resolveDeckOperationAccess({
        operation: "share",
        role: "editor",
      })
      assert(!editorShare.ok, "Editors should not be able to change sharing")
      assertEqual(editorShare.status, 403, "Editor share updates should be forbidden")

      const viewerComment = resolveDeckOperationAccess({
        operation: "comment",
        role: "viewer",
      })
      assert(viewerComment.ok, "Viewers should be able to participate in review comments")
      assertEqual(viewerComment.mode, "write", "Viewer comments should be tracked as write operations")

      const viewerSave = resolveDeckOperationAccess({
        operation: "save",
        role: "viewer",
      })
      assert(!viewerSave.ok, "Viewers should not be able to save decks")
      assertEqual(viewerSave.status, 403, "Viewer save attempts should be forbidden")

      const anonymousRead = resolveDeckOperationAccess({
        operation: "read",
        role: "anonymous",
      })
      assert(!anonymousRead.ok, "Anonymous deck reads should require an explicit share path")
      assertEqual(anonymousRead.status, 401, "Anonymous deck access should be unauthenticated")
    },
  },
  {
    name: "deck collaborator policy normalizes emails and roles",
    run() {
      const accepted = parseDeckCollaboratorUpsert({
        email: "  Teammate@Example.com ",
        role: "editor",
      })

      assert(accepted, "Valid collaborator payload should be accepted")
      assertEqual(
        accepted.email,
        "teammate@example.com",
        "Collaborator emails should be normalized",
      )
      assertEqual(accepted.role, "editor", "Editor role should be preserved")
      assertEqual(
        parseDeckCollaboratorUpsert({ email: "missing-at", role: "viewer" }),
        null,
        "Invalid collaborator emails should be rejected",
      )
      assertEqual(
        parseDeckCollaboratorUpsert({ email: "reader@example.com", role: "owner" }),
        null,
        "Owner role should not be grantable through collaborator invites",
      )
    },
  },
  {
    name: "deck collaboration event policy validates operation envelopes",
    run() {
      const parsed = parseDeckCollaborationEvent({
        clientEventId: "client-1",
        payload: { slideId: "slide-1", x: 120, y: 80 },
        type: "cursor",
      })

      assert(parsed, "Valid cursor event should be accepted")
      assertEqual(parsed.clientEventId, "client-1", "Client event id should be preserved")
      assertEqual(parsed.type, "cursor", "Cursor event type should be preserved")
      const mutation = parseDeckCollaborationEvent({
        clientEventId: "client-4",
        payload: {
          action: "move",
          elements: [
            {
              height: 20,
              id: "shape-1",
              rotation: 15,
              type: "shape",
              width: 30,
              x: 10,
              y: 12,
            },
          ],
          slideId: "slide-1",
        },
        type: "object-mutation",
      })

      assert(mutation, "Valid object mutation event should be accepted")
      assertEqual(
        mutation.type,
        "object-mutation",
        "Object mutation event type should be preserved",
      )
      assertEqual(
        parseDeckCollaborationEvent({
          clientEventId: "",
          payload: { slideId: "slide-1" },
          type: "cursor",
        }),
        null,
        "Events without client ids should be rejected",
      )
      assertEqual(
        parseDeckCollaborationEvent({
          clientEventId: "client-2",
          payload: ["slide-1"],
          type: "selection",
        }),
        null,
        "Array payloads should be rejected",
      )
      assertEqual(
        parseDeckCollaborationEvent({
          clientEventId: "client-3",
          payload: { slideId: "slide-1" },
          type: "delete",
        }),
        null,
        "Unknown collaboration event types should be rejected",
      )
      assertEqual(
        parseDeckCollaborationEvent({
          clientEventId: "client-5",
          payload: { elements: [], slideId: "slide-1" },
          type: "object-mutation",
        }),
        null,
        "Object mutation events without element snapshots should be rejected",
      )
    },
  },
  {
    name: "collaboration cursor projection keeps the latest visible remote cursor",
    run() {
      const now = Date.parse("2026-05-14T12:00:10.000Z")
      const event = (
        overrides: Partial<CloudDeckCollaborationEvent>,
      ): CloudDeckCollaborationEvent => ({
        clientEventId: "client",
        createdAt: "2026-05-14T12:00:00.000Z",
        deckId: "deck-1",
        id: "event-1",
        payload: { slideId: "slide-1", x: 10, y: 20 },
        role: "editor",
        type: "cursor",
        userId: "remote-1",
        ...overrides,
      })

      const cursors = recentCollaborationCursors(
        [
          event({ id: "older", createdAt: "2026-05-14T12:00:01.000Z" }),
          event({
            id: "newer",
            createdAt: "2026-05-14T12:00:04.000Z",
            payload: { slideId: "slide-1", x: 120, y: -10 },
          }),
          event({
            id: "own",
            createdAt: "2026-05-14T12:00:05.000Z",
            userId: "current-user",
          }),
          event({
            id: "other-slide",
            createdAt: "2026-05-14T12:00:06.000Z",
            payload: { slideId: "slide-2", x: 45, y: 45 },
            userId: "remote-2",
          }),
          event({
            id: "stale",
            createdAt: "2026-05-14T11:59:00.000Z",
            userId: "remote-3",
          }),
        ],
        {
          activeSlideId: "slide-1",
          currentUserId: "current-user",
          now,
        },
      )

      assertEqual(cursors.length, 1, "Only the visible remote cursor should remain")
      assertEqual(cursors[0]?.eventId, "newer", "Latest cursor per user should win")
      assertEqual(cursors[0]?.x, 100, "Cursor x should be clamped to slide bounds")
      assertEqual(cursors[0]?.y, 0, "Cursor y should be clamped to slide bounds")
      assertEqual(
        collaborationCursorFromEvent(
          event({ payload: { slideId: "slide-1", x: "bad", y: 50 } }),
        ),
        null,
        "Cursor payloads without numeric coordinates should be ignored",
      )
    },
  },
  {
    name: "collaboration selection projection tracks remote selected objects",
    run() {
      const now = Date.parse("2026-05-14T12:00:10.000Z")
      const event = (
        overrides: Partial<CloudDeckCollaborationEvent>,
      ): CloudDeckCollaborationEvent => ({
        clientEventId: "selection-client",
        createdAt: "2026-05-14T12:00:00.000Z",
        deckId: "deck-1",
        id: "selection-1",
        payload: { elementIds: ["shape-1"], slideId: "slide-1" },
        role: "editor",
        type: "selection",
        userId: "remote-1",
        ...overrides,
      })

      const selections = recentCollaborationSelections(
        [
          event({
            id: "old-selection",
            createdAt: "2026-05-14T12:00:01.000Z",
          }),
          event({
            id: "edit-intent",
            createdAt: "2026-05-14T12:00:04.000Z",
            payload: {
              action: "resize",
              elementIds: ["shape-2", "shape-2", ""],
              slideId: "slide-1",
            },
            type: "edit-intent",
          }),
          event({
            id: "own-selection",
            createdAt: "2026-05-14T12:00:05.000Z",
            userId: "current-user",
          }),
          event({
            id: "other-slide",
            createdAt: "2026-05-14T12:00:06.000Z",
            payload: { elementIds: ["shape-3"], slideId: "slide-2" },
            userId: "remote-2",
          }),
        ],
        {
          activeSlideId: "slide-1",
          currentUserId: "current-user",
          now,
          requireElements: true,
          type: "edit-intent",
        },
      )

      assertEqual(selections.length, 1, "Only matching remote edit intents should remain")
      assertEqual(selections[0]?.eventId, "edit-intent", "Latest edit intent should win")
      assertArrayEqual(
        selections[0]?.elementIds ?? [],
        ["shape-2"],
        "Selection element ids should be normalized and deduped",
      )
      assertEqual(selections[0]?.action, "resize", "Edit intent action should be preserved")
      assertEqual(
        collaborationSelectionFromEvent(
          event({ payload: { elementIds: ["shape-1"], slideId: "" } }),
        ),
        null,
        "Selection payloads without a slide should be ignored",
      )
    },
  },
  {
    name: "collaboration object mutation projection keeps latest remote object snapshots",
    run() {
      const now = Date.parse("2026-05-14T12:00:10.000Z")
      const sourceElement = {
        ...createElement("shape"),
        content: "Shape",
        height: 20,
        rotation: 15,
        width: 30,
        x: 10,
        y: 12,
      }
      const payload = collaborationMutationPayloadFromElements({
        action: "move",
        elements: [sourceElement],
        slideId: "slide-1",
      })

      assert(payload, "Object mutation payload should be created from elements")
      const event = (
        overrides: Partial<CloudDeckCollaborationEvent>,
      ): CloudDeckCollaborationEvent => ({
        clientEventId: "mutation-client",
        createdAt: "2026-05-14T12:00:00.000Z",
        deckId: "deck-1",
        id: "mutation-1",
        payload,
        role: "editor",
        type: "object-mutation",
        userId: "remote-1",
        ...overrides,
      })

      const mutations = recentCollaborationMutations(
        [
          event({ id: "older", createdAt: "2026-05-14T12:00:01.000Z" }),
          event({
            id: "newer",
            createdAt: "2026-05-14T12:00:04.000Z",
            payload: {
              action: "resize",
              elements: [
                {
                  height: 45,
                  id: "shape-1",
                  rotation: 30,
                  type: "shape",
                  width: 55,
                  x: 120,
                  y: -10,
                },
              ],
              slideId: "slide-1",
            },
          }),
          event({
            id: "own",
            createdAt: "2026-05-14T12:00:05.000Z",
            userId: "current-user",
          }),
          event({
            id: "other-slide",
            createdAt: "2026-05-14T12:00:06.000Z",
            payload: { ...payload, slideId: "slide-2" },
            userId: "remote-2",
          }),
          event({
            id: "stale",
            createdAt: "2026-05-14T11:59:00.000Z",
            userId: "remote-3",
          }),
        ],
        {
          activeSlideId: "slide-1",
          currentUserId: "current-user",
          now,
        },
      )

      assertEqual(mutations.length, 1, "Only visible remote mutations should remain")
      assertEqual(mutations[0]?.eventId, "newer", "Latest mutation per user should win")
      assertEqual(mutations[0]?.action, "resize", "Mutation action should be preserved")
      assertEqual(
        mutations[0]?.elements[0]?.x,
        100,
        "Mutation x should be clamped to slide bounds",
      )
      assertEqual(
        mutations[0]?.elements[0]?.y,
        0,
        "Mutation y should be clamped to slide bounds",
      )
      assertEqual(
        collaborationMutationFromEvent(
          event({ payload: { elements: [], slideId: "slide-1" } }),
        ),
        null,
        "Mutation payloads without element snapshots should be ignored",
      )
    },
  },
  {
    name: "collaboration mutation reconciliation applies safe remote object patches",
    run() {
      const deck = createDefaultDeck()
      const slide = deck.slides[0]
      assert(slide, "Default deck should include a slide")
      const baseElement = {
        ...createElement("shape"),
        id: "shape-1",
        rotation: 0,
        x: 10,
        y: 12,
        width: 20,
        height: 16,
      }
      const lockedElement = {
        ...createElement("shape"),
        id: "locked-shape",
        locked: true,
      }
      const preparedDeck: Deck = {
        ...deck,
        slides: [
          {
            ...slide,
            elements: [baseElement, lockedElement],
          },
          ...deck.slides.slice(1),
        ],
      }
      const mutation = collaborationMutationFromEvent({
        clientEventId: "mutation-client",
        createdAt: "2026-05-14T12:00:00.000Z",
        deckId: preparedDeck.id,
        id: "mutation-event",
        payload: {
          action: "move",
          elements: [
            {
              height: 18,
              id: "shape-1",
              rotation: 45,
              type: "shape",
              width: 22,
              x: 24,
              y: 28,
            },
            {
              height: 16,
              id: "locked-shape",
              type: "shape",
              width: 20,
              x: 30,
              y: 30,
            },
          ],
          slideId: slide.id,
        },
        role: "editor",
        type: "object-mutation",
        userId: "remote-1",
      })
      assert(mutation, "Mutation should parse before reconciliation")

      const result = applyCollaborationObjectMutation(preparedDeck, mutation)
      assertEqual(result.appliedCount, 1, "Only safe remote patches should apply")
      assertEqual(
        result.deck.slides[0]?.elements[0]?.x,
        24,
        "Remote mutation reconciliation should update object geometry",
      )
      assertEqual(
        result.deck.slides[0]?.elements[0]?.rotation,
        45,
        "Remote mutation reconciliation should update object rotation",
      )
      assertEqual(
        result.skipped[0]?.reason,
        "locked-element",
        "Remote mutation reconciliation should skip locked elements",
      )
      assertEqual(
        collaborationMutationApplySummary(result),
        "Applied 1 remote object. Skipped 1 locked object.",
        "Remote mutation reconciliation should summarize applied and skipped objects",
      )
      const skipDetails = collaborationMutationSkipDetails(
        result.deck,
        mutation,
        result,
      )
      assertEqual(
        skipDetails[0]?.canSelectLocalElement,
        true,
        "Skipped remote mutation details should mark existing local objects as selectable",
      )
      assertEqual(
        skipDetails[0]?.localElementType,
        "shape",
        "Skipped remote mutation details should expose the local object type",
      )

      const missingMutation = collaborationMutationFromEvent({
        clientEventId: "missing-mutation-client",
        createdAt: "2026-05-14T12:00:02.000Z",
        deckId: preparedDeck.id,
        id: "missing-mutation",
        payload: {
          action: "move",
          elements: [
            {
              height: 18,
              id: "missing-shape",
              rotation: 0,
              type: "shape",
              width: 22,
              x: 24,
              y: 28,
            },
          ],
          slideId: slide.id,
        },
        role: "editor",
        type: "object-mutation",
        userId: "remote-1",
      })
      assert(missingMutation, "Missing mutation should parse before reconciliation")
      const missingResult = applyCollaborationObjectMutation(
        preparedDeck,
        missingMutation,
      )
      assertEqual(
        collaborationMutationSkipDetails(
          missingResult.deck,
          missingMutation,
          missingResult,
        )[0]?.canSelectLocalElement,
        false,
        "Skipped missing objects should not be exposed as jump targets",
      )

      const textElement = {
        ...createElement("text"),
        content: "Original",
        id: "text-1",
      }
      const textDeck: Deck = {
        ...preparedDeck,
        slides: [{ ...slide, elements: [textElement] }],
      }
      const textMutation = collaborationMutationFromEvent({
        clientEventId: "text-mutation-client",
        createdAt: "2026-05-14T12:00:01.000Z",
        deckId: textDeck.id,
        id: "text-mutation",
        payload: {
          action: "text",
          elements: [
            {
              content: "Remote text",
              height: textElement.height,
              id: textElement.id,
              type: "text",
              width: textElement.width,
              x: textElement.x,
              y: textElement.y,
            },
          ],
          slideId: slide.id,
        },
        role: "editor",
        type: "object-mutation",
        userId: "remote-1",
      })
      assert(textMutation, "Text mutation should parse before reconciliation")

      const textResult = applyCollaborationObjectMutation(textDeck, textMutation)
      assertEqual(
        textResult.deck.slides[0]?.elements[0]?.content,
        "Remote text",
        "Accepted text mutations should update text content",
      )
    },
  },
  {
    name: "collaboration activity labels keep presence summaries useful",
    run() {
      const baseEvent: CloudDeckCollaborationEvent = {
        clientEventId: "activity-client",
        createdAt: "2026-05-14T12:00:00.000Z",
        deckId: "deck-1",
        id: "activity-1",
        payload: { elementIds: ["shape-1", "shape-2"], slideId: "slide-1" },
        role: "editor",
        type: "selection",
        userId: "remote-1",
      }

      assertEqual(
        collaborationActivityLabel(baseEvent),
        "Selected 2 objects",
        "Selection activity should include selected object counts",
      )
      assertEqual(
        collaborationActivityLabel({
          ...baseEvent,
          payload: { action: "rotate", elementIds: ["shape-1"], slideId: "slide-1" },
          type: "edit-intent",
        }),
        "Rotating 1 object",
        "Edit intents should show the editing action",
      )
      assertEqual(
        collaborationActivityLabel({
          ...baseEvent,
          payload: {
            action: "move",
            elements: [
              {
                height: 20,
                id: "shape-1",
                type: "shape",
                width: 20,
                x: 10,
                y: 10,
              },
            ],
            slideId: "slide-1",
          },
          type: "object-mutation",
        }),
        "Moved 1 object",
        "Object mutations should summarize committed remote changes",
      )
      assertEqual(
        shouldShowPresenceActivity({ ...baseEvent, type: "cursor" }),
        false,
        "Cursor pings should not crowd the presence activity list",
      )
    },
  },
  {
    name: "deck share update policy validates expiry, booleans, and access-code actions",
    run() {
      const now = new Date("2026-05-14T00:00:00.000Z")

      assertEqual(
        resolveDeckShareUpdate({ body: null, now }).ok,
        false,
        "Empty share updates should be rejected",
      )
      assertEqual(
        resolveDeckShareUpdate({
          body: { accessCodeAction: "rotate" },
          now,
        }).ok,
        false,
        "Unknown access-code actions should be rejected",
      )
      assertEqual(
        resolveDeckShareUpdate({
          body: { enabled: "yes" },
          now,
        }).ok,
        false,
        "Non-boolean enabled values should be rejected",
      )
      assertEqual(
        resolveDeckShareUpdate({
          body: { allowDownloads: "no" },
          now,
        }).ok,
        false,
        "Non-boolean download values should be rejected",
      )
      assertEqual(
        resolveDeckShareUpdate({
          body: { expiresAt: "2026-05-13T23:59:59.000Z" },
          now,
        }).ok,
        false,
        "Past expiries should be rejected",
      )

      const generated = resolveDeckShareUpdate({
        body: {
          accessCodeAction: "generate",
          allowDownloads: false,
          enabled: false,
          expiresAt: "2026-05-15T00:00:00.000Z",
        },
        now,
      })

      assert(generated.ok, "Valid share update should be accepted")
      assertEqual(
        generated.patch.accessCodeAction,
        "generate",
        "Generate action should be preserved",
      )
      assertEqual(
        generated.patch.allowDownloads,
        false,
        "False allow-downloads values should be preserved",
      )
      assertEqual(
        generated.patch.enabled,
        false,
        "False enabled values should be preserved",
      )
      assertEqual(
        generated.patch.expiresAt?.toISOString(),
        "2026-05-15T00:00:00.000Z",
        "Future expiry should be parsed",
      )

      const cleared = resolveDeckShareUpdate({
        body: { accessCodeAction: "clear", expiresAt: null },
        now,
      })

      assert(cleared.ok, "Clearing access code and expiry should be accepted")
      assertEqual(
        cleared.patch.accessCodeAction,
        "clear",
        "Clear action should be preserved",
      )
      assertEqual(
        cleared.patch.expiresAt,
        null,
        "Null expiry should clear expiry",
      )
    },
  },
  {
    name: "shared view review snapshot summarizes permissions and review load",
    run() {
      const deck = createDefaultDeck()
      const [firstSlide, secondSlide] = deck.slides

      assert(firstSlide && secondSlide, "Default deck should include two slides")

      const reviewDeck = {
        ...deck,
        slides: [
          {
            ...firstSlide,
            notes: "Presenter-only setup detail.",
            comments: [
              {
                id: "comment-1",
                authorName: "Ava",
                body: "Please confirm with @ops.",
                createdAt: "2026-05-15T08:00:00.000Z",
                mentions: ["ops"],
                resolved: false,
                targetElementId: "",
                updatedAt: "2026-05-15T08:00:00.000Z",
              },
              {
                id: "comment-2",
                authorName: "Mira",
                body: "Imported PowerPoint reply.",
                createdAt: "2026-05-15T08:05:00.000Z",
                mentions: [],
                resolved: false,
                source: "pptx" as const,
                sourceCommentId: "reply-2",
                sourceThreadId: "thread-1",
                targetElementId: "",
                updatedAt: "2026-05-15T08:05:00.000Z",
              },
              {
                id: "comment-3",
                authorName: "Nia",
                body: "Already handled.",
                createdAt: "2026-05-15T08:10:00.000Z",
                mentions: ["done"],
                resolved: true,
                targetElementId: "",
                updatedAt: "2026-05-15T08:10:00.000Z",
              },
            ],
          },
          secondSlide,
        ],
      }
      const snapshot = sharedViewReviewSnapshot(reviewDeck, {
        allowDownloads: false,
      })
      const items = sharedViewReviewItems(reviewDeck)
      const report = serializeSharedViewReviewReport(reviewDeck, {
        allowDownloads: false,
      })

      assertEqual(snapshot.downloadMode, "disabled", "Shared snapshot should preserve download permission")
      assertEqual(snapshot.slideCount, 2, "Shared snapshot should count viewable slides")
      assertEqual(snapshot.openCommentCount, 2, "Shared snapshot should count unresolved comments")
      assertEqual(snapshot.mentionCount, 1, "Shared snapshot should count unresolved mentions only")
      assertEqual(snapshot.pptxThreadCount, 1, "Shared snapshot should count unresolved PPTX threads")
      assertEqual(snapshot.notesSlideCount, 1, "Shared snapshot should count slides with notes")
      assertEqual(snapshot.reviewStatus, "needs-review", "Shared snapshot should flag unresolved review work")
      assertEqual(items.length, 2, "Shared review items should include unresolved comments only")
      assertEqual(items[1]?.sourceThreadId, "thread-1", "Shared review items should preserve PPTX thread ids")
      assert(report.includes("Downloads: disabled"), "Shared review report should preserve download permission")
      assert(report.includes("Open comments: 2"), "Shared review report should include unresolved count")
      assert(report.includes("Mentions: 1"), "Shared review report should include mention count")
      assert(report.includes("PPTX threads: 1"), "Shared review report should include PPTX thread count")
      assert(report.includes("Slide 1"), "Shared review report should include slide references")
      assert(report.includes("@ops"), "Shared review report should include mention labels")
    },
  },
  {
    name: "owner review handoff export preserves thread replies and role policy",
    run() {
      const deck = createDefaultDeck()
      const [firstSlide, secondSlide] = deck.slides

      assert(firstSlide && secondSlide, "Default deck should include two slides")

      const targetElementId = firstSlide.elements[0]?.id ?? ""
      const reviewDeck = {
        ...deck,
        slides: [
          {
            ...firstSlide,
            comments: [
              {
                id: "manual-1",
                authorName: "Ava",
                body: "Follow up with @ops",
                createdAt: "2026-05-16T08:00:00.000Z",
                mentions: ["ops"],
                resolved: false,
                targetElementId,
                updatedAt: "2026-05-16T08:00:00.000Z",
              },
              {
                id: "root-1",
                authorName: "Mira",
                body: "Imported root thread",
                createdAt: "2026-05-16T08:05:00.000Z",
                mentions: [],
                resolved: false,
                source: "pptx" as const,
                sourceCommentId: "ppt-root-1",
                sourceThreadId: "ppt-thread-1",
                targetElementId,
                updatedAt: "2026-05-16T08:05:00.000Z",
              },
              {
                id: "reply-1",
                authorName: "Nia",
                body: "Reply stays attached",
                createdAt: "2026-05-16T08:06:00.000Z",
                mentions: [],
                resolved: false,
                source: "pptx" as const,
                sourceCommentId: "ppt-reply-1",
                sourceParentCommentId: "ppt-root-1",
                sourceReplyDepth: 1,
                sourceReplyToAuthorName: "Mira",
                sourceThreadId: "ppt-thread-1",
                targetElementId,
                updatedAt: "2026-05-16T08:06:00.000Z",
              },
              {
                id: "resolved-1",
                authorName: "Lee",
                body: "Done",
                createdAt: "2026-05-16T08:07:00.000Z",
                mentions: ["done"],
                resolved: true,
                targetElementId,
                updatedAt: "2026-05-16T08:07:00.000Z",
              },
            ],
          },
          secondSlide,
        ],
      }
      const viewerSnapshot = collaborationReviewHandoffSnapshot(reviewDeck, {
        allowDownloads: false,
        role: "viewer",
      })
      const ownerSnapshot = collaborationReviewHandoffSnapshot(reviewDeck, {
        role: "owner",
      })
      const items = collaborationReviewHandoffItems(reviewDeck)
      const report = serializeCollaborationReviewHandoff(reviewDeck, {
        role: "owner",
      })

      assertEqual(viewerSnapshot.downloadMode, "disabled", "Viewer handoff snapshot should preserve download state")
      assertEqual(viewerSnapshot.openCommentCount, 3, "Handoff snapshot should include unresolved comments only")
      assertEqual(viewerSnapshot.mentionCount, 1, "Handoff snapshot should count unresolved mentions")
      assertEqual(viewerSnapshot.pptxThreadCount, 1, "Handoff snapshot should dedupe PPTX threads")
      assertEqual(viewerSnapshot.pptxReplyCount, 1, "Handoff snapshot should count PPTX replies")
      assertEqual(viewerSnapshot.manualCommentCount, 1, "Handoff snapshot should count manual review notes")
      assertEqual(viewerSnapshot.policy.mergeStatus, "blocked", "Viewer merge should stay blocked in handoff policy")
      assertEqual(viewerSnapshot.policy.canComment, true, "Viewers should remain review-comment participants")
      assertEqual(ownerSnapshot.policy.canCopyOwnerExport, true, "Owners should be able to copy owner handoff exports")
      assertEqual(ownerSnapshot.policy.canShare, true, "Owners should retain share handoff authority")
      assertEqual(items[0]?.handoffMode, "speaker-note-handoff", "Manual comments should hand off through export notes")
      assertEqual(items[1]?.handoffMode, "native-thread", "PPTX roots should stay root-thread candidates")
      assertEqual(items[2]?.handoffMode, "native-thread-reply", "PPTX replies should stay reply-thread candidates")
      assertEqual(items[2]?.sourceParentCommentId, "ppt-root-1", "Reply parent ids should be preserved")
      assert(report.includes("Role: owner"), "Owner handoff report should include role")
      assert(report.includes("Merge access: allowed"), "Owner handoff report should include merge access")
      assert(report.includes("Owner export: allowed"), "Owner handoff report should include export access")
      assert(report.includes("Reply to: ppt-root-1"), "Owner handoff report should include reply parent ids")
      assert(report.includes("@ops"), "Owner handoff report should include mention labels")
    },
  },
  {
    name: "pptx comment thread plan groups native replies and manual note handoffs",
    run() {
      const deck = createDefaultDeck()
      const [firstSlide] = deck.slides

      assert(firstSlide, "Default deck should include a first slide")

      const targetElementId = firstSlide.elements[0]?.id ?? ""
      const reviewDeck = {
        ...deck,
        title: "Thread rebuild deck",
        slides: [
          {
            ...firstSlide,
            title: "Review map",
            comments: [
              {
                id: "manual-1",
                authorName: "Ava",
                body: "Carry this manual note for @ops",
                createdAt: "2026-05-16T09:00:00.000Z",
                mentions: ["ops"],
                resolved: false,
                targetElementId: "",
                updatedAt: "2026-05-16T09:00:00.000Z",
              },
              {
                id: "root-1",
                authorName: "Mira",
                body: "Imported root thread",
                createdAt: "2026-05-16T09:05:00.000Z",
                mentions: [],
                resolved: false,
                source: "pptx" as const,
                sourceAnchor: { x: 24, y: 32 },
                sourceCommentId: "ppt-root-1",
                sourceThreadId: "ppt-thread-1",
                targetElementId,
                updatedAt: "2026-05-16T09:05:00.000Z",
              },
              {
                id: "reply-1",
                authorName: "Nia",
                body: "Reply stays attached",
                createdAt: "2026-05-16T09:06:00.000Z",
                mentions: [],
                resolved: false,
                source: "pptx" as const,
                sourceCommentId: "ppt-reply-1",
                sourceParentCommentId: "ppt-root-1",
                sourceReplyDepth: 1,
                sourceReplyToAuthorName: "Mira",
                sourceThreadId: "ppt-thread-1",
                targetElementId,
                updatedAt: "2026-05-16T09:06:00.000Z",
              },
            ],
          },
          ...deck.slides.slice(1),
        ],
      }
      const plan = pptxCommentThreadPlan(reviewDeck)
      const report = serializePptxCommentThreadPlan(reviewDeck)
      const xmlAuthoring = pptxCommentXmlAuthoring(reviewDeck)
      const xmlAuthoringText = serializePptxCommentXmlAuthoring(reviewDeck)
      const slideCommentPart = xmlAuthoring.parts.find(
        (part) => part.path === "ppt/comments/comment1.xml",
      )

      assertEqual(plan.totalOpenComments, 3, "Comment XML plan should count open comments")
      assertEqual(plan.nativeThreadCount, 1, "Comment XML plan should group native PPTX threads")
      assertEqual(plan.nativeReplyCount, 1, "Comment XML plan should count native replies")
      assertEqual(plan.manualHandoffCount, 1, "Comment XML plan should count manual note handoffs")
      assertEqual(plan.anchorReadyCount, 1, "Comment XML plan should count anchor-ready native threads")
      assertEqual(plan.missingAnchorCount, 1, "Comment XML plan should flag manual handoffs without anchors")
      assertEqual(plan.mentionCount, 1, "Comment XML plan should preserve mention counts")
      assertEqual(plan.items[0]?.mode, "native-thread", "Native threads should sort before manual handoffs on the slide")
      assertEqual(plan.items[0]?.commentCount, 2, "Native thread item should group root and reply comments")
      assertEqual(plan.items[0]?.targetLabel, firstSlide.elements[0]?.content, "Native thread item should preserve target labels")
      assertEqual(xmlAuthoring.readyPartCount, 3, "Comment XML authoring should create author, comment, and slide relationship parts")
      assertEqual(xmlAuthoring.nativeCommentCount, 2, "Comment XML authoring should promote imported PowerPoint comments")
      assertEqual(xmlAuthoring.authorCount, 2, "Comment XML authoring should register native comment authors")
      assert(
        Boolean(
          slideCommentPart?.xml.includes('<p:cm authorId="0"') &&
            slideCommentPart.xml.includes('id="ppt-root-1"') &&
            slideCommentPart.xml.includes('threadId="ppt-thread-1"') &&
            slideCommentPart.xml.includes('parentId="ppt-root-1"') &&
            slideCommentPart.xml.includes('replyDepth="1"') &&
            slideCommentPart.xml.includes('<p:pos x="24" y="32"') &&
            slideCommentPart.xml.includes("Reply stays attached"),
        ),
        "Comment XML authoring should preserve source ids, thread metadata, anchors, and reply bodies",
      )
      assert(report.includes("PowerPoint comment XML plan"), "Serialized plan should identify the report")
      assert(report.includes("Native threads: 1"), "Serialized plan should include native thread count")
      assert(report.includes("Manual comment handoffs: 1"), "Serialized plan should include manual handoff count")
      assert(report.includes("Mentions: 1"), "Serialized plan should include mention totals")
      assert(report.includes("Thread: ppt-thread-1"), "Serialized plan should include source thread ids")
      assert(
        xmlAuthoringText.includes("PowerPoint comment XML authoring") &&
          xmlAuthoringText.includes("ppt/commentAuthors.xml") &&
          xmlAuthoringText.includes("ppt/comments/comment1.xml"),
        "Serialized comment XML authoring should include authored package part paths",
      )
    },
  },
  {
    name: "review thread lifecycle groups role-aware thread controls",
    run() {
      const deck = createDefaultDeck()
      const [firstSlide] = deck.slides

      assert(firstSlide, "Default deck should include a first slide")

      const reviewDeck: Deck = {
        ...deck,
        slides: [
          {
            ...firstSlide,
            comments: [
              {
                id: "manual-1",
                authorName: "Ava",
                body: "Manual follow-up for @ops.",
                createdAt: "2026-05-16T09:00:00.000Z",
                mentions: ["ops"],
                resolved: false,
                targetElementId: "",
                updatedAt: "2026-05-16T09:00:00.000Z",
              },
              {
                id: "ppt-root-1",
                authorName: "Mira",
                body: "Imported root thread",
                createdAt: "2026-05-16T09:01:00.000Z",
                mentions: [],
                resolved: true,
                source: "pptx" as const,
                sourceCommentId: "ppt-root-1",
                sourceThreadId: "ppt-thread-1",
                targetElementId: "",
                updatedAt: "2026-05-16T09:01:00.000Z",
              },
              {
                id: "ppt-reply-1",
                authorName: "Nia",
                body: "Reply needs owner review",
                createdAt: "2026-05-16T09:02:00.000Z",
                mentions: [],
                resolved: false,
                source: "pptx" as const,
                sourceCommentId: "ppt-reply-1",
                sourceParentCommentId: "ppt-root-1",
                sourceReplyDepth: 1,
                sourceThreadId: "ppt-thread-1",
                targetElementId: "",
                updatedAt: "2026-05-16T09:02:00.000Z",
              },
            ],
          },
          ...deck.slides.slice(1),
        ],
      }
      const ownerItems = reviewThreadLifecycleItems(reviewDeck, { role: "owner" })
      const viewerItems = reviewThreadLifecycleItems(reviewDeck, {
        role: "viewer",
      })
      const ownerSummary = reviewThreadLifecycleSummary(reviewDeck, {
        role: "owner",
      })
      const pptxThread = ownerItems.find(
        (item) => item.threadId === "ppt-thread-1",
      )
      const viewerManualThread = viewerItems.find(
        (item) => item.threadId === "manual-1",
      )

      assertEqual(ownerItems.length, 2, "Lifecycle should group comments into threads")
      assertEqual(ownerSummary.openThreadCount, 1, "Lifecycle should count open threads")
      assertEqual(ownerSummary.mixedThreadCount, 1, "Lifecycle should count mixed PPTX threads")
      assertEqual(ownerSummary.resolvedThreadCount, 0, "Lifecycle should count resolved threads")
      assertEqual(pptxThread?.mode, "pptx-reply-thread", "PPTX replies should mark the thread mode")
      assertEqual(pptxThread?.state, "mixed", "Mixed resolved/open PPTX threads should be explicit")
      assertEqual(pptxThread?.commentIds.length, 2, "PPTX thread comments should stay grouped")
      assertEqual(
        pptxThread?.replyControl.mode,
        "reply",
        "Mixed PowerPoint threads should allow direct replies",
      )
      assertEqual(
        pptxThread?.replyControl.parentCommentId,
        "ppt-reply-1",
        "Reply controls should target the latest PowerPoint source comment",
      )
      assertEqual(
        pptxThread?.replyControl.nextReplyDepth,
        2,
        "Reply controls should advance imported PowerPoint reply depth",
      )
      assert(
        Boolean(
          pptxThread?.actions.find(
            (action) => action.id === "resolve" && action.enabled,
          ),
        ),
        "Owners should be able to resolve mixed review threads",
      )
      assert(
        Boolean(
          viewerManualThread?.actions.find(
            (action) => action.id === "reply" && action.enabled,
          ),
        ),
        "Viewers should still be able to reply to open review threads",
      )
      assertEqual(
        viewerManualThread?.replyControl.label,
        "Reply to thread",
        "Manual thread reply controls should use Essence reply labels",
      )
      assert(
        Boolean(
          viewerManualThread?.actions.find(
            (action) => action.id === "resolve" && !action.enabled,
          ),
        ),
        "Viewers should not be able to resolve review threads",
      )
      assert(
        Boolean(
          viewerManualThread?.actions.find(
            (action) => action.id === "delete" && !action.enabled,
          ),
        ),
        "Viewers should not be able to delete review threads",
      )
    },
  },
  {
    name: "collaboration reviewer operations expose owner exports and safe merge previews",
    run() {
      const deck = createDefaultDeck()
      const [firstSlide, secondSlide] = deck.slides

      assert(firstSlide && secondSlide, "Default deck should include two slides")

      const targetElementId = firstSlide.elements[0]?.id ?? ""
      const reviewDeck: Deck = {
        ...deck,
        title: "Reviewer operations deck",
        updatedAt: "2026-05-16T10:00:00.000Z",
        slides: [
          {
            ...firstSlide,
            title: "Review operations",
            comments: [
              {
                id: "manual-ops-1",
                authorName: "Ava",
                body: "Manual owner follow-up for @ops",
                createdAt: "2026-05-16T10:00:00.000Z",
                mentions: ["ops"],
                resolved: false,
                targetElementId,
                updatedAt: "2026-05-16T10:00:00.000Z",
              },
              {
                id: "ppt-root-ops-1",
                authorName: "Mira",
                body: "Imported root operation thread",
                createdAt: "2026-05-16T10:01:00.000Z",
                mentions: [],
                resolved: false,
                source: "pptx" as const,
                sourceAnchor: { x: 40, y: 60 },
                sourceCommentId: "ppt-root-ops-1",
                sourceThreadId: "ppt-thread-ops-1",
                targetElementId,
                updatedAt: "2026-05-16T10:01:00.000Z",
              },
              {
                id: "ppt-reply-ops-1",
                authorName: "Nia",
                body: "Reply is still connected",
                createdAt: "2026-05-16T10:02:00.000Z",
                mentions: [],
                resolved: false,
                source: "pptx" as const,
                sourceCommentId: "ppt-reply-ops-1",
                sourceParentCommentId: "ppt-root-ops-1",
                sourceReplyDepth: 1,
                sourceThreadId: "ppt-thread-ops-1",
                targetElementId,
                updatedAt: "2026-05-16T10:02:00.000Z",
              },
            ],
          },
          secondSlide,
        ],
      }
      const [reviewFirstSlide] = reviewDeck.slides

      assert(reviewFirstSlide, "Review deck should include a first slide")

      const localDeck: Deck = {
        ...reviewDeck,
        title: "Reviewer operations local",
        updatedAt: "2026-05-16T10:05:00.000Z",
        slides: [
          {
            ...reviewFirstSlide,
            title: "Local review operations",
          },
          secondSlide,
        ],
      }
      const cloudDeck: Deck = {
        ...reviewDeck,
        title: "Reviewer operations cloud",
        updatedAt: "2026-05-16T10:06:00.000Z",
        slides: [
          {
            ...reviewFirstSlide,
            title: "Cloud review operations",
          },
          secondSlide,
        ],
      }
      const ownerPreview = collaborationReviewerMergePreview({
        baseDeck: reviewDeck,
        cloudDeck,
        localDeck,
        role: "owner",
      })
      const viewerPreview = collaborationReviewerMergePreview({
        baseDeck: reviewDeck,
        cloudDeck,
        localDeck,
        role: "viewer",
      })
      const ownerSnapshot = collaborationReviewOperationsSnapshot(reviewDeck, {
        baseDeck: reviewDeck,
        cloudDeck,
        localDeck,
        role: "owner",
      })
      const viewerSnapshot = collaborationReviewOperationsSnapshot(reviewDeck, {
        allowDownloads: false,
        baseDeck: reviewDeck,
        cloudDeck,
        localDeck,
        role: "viewer",
      })
      const choices = collaborationReviewExportChoices(reviewDeck, {
        role: "owner",
      })
      const report = serializeCollaborationReviewOperationsSnapshot(reviewDeck, {
        baseDeck: reviewDeck,
        cloudDeck,
        localDeck,
        role: "owner",
      })

      assertEqual(ownerPreview.status, "conflict", "Owner merge previews should expose conflicts")
      assertEqual(viewerPreview.status, "blocked", "Viewer merge previews should be review-only")
      assertEqual(ownerSnapshot.status, "attention", "Operations snapshot should flag active review work")
      assertEqual(ownerSnapshot.enabledExportChoiceCount, 4, "Owners should see every available export choice")
      assertEqual(viewerSnapshot.enabledExportChoiceCount, 0, "Download-disabled viewers should not get copy exports")
      assertEqual(ownerSnapshot.commentPlan.nativeThreadCount, 1, "Operations should preserve native thread plans")
      assertEqual(ownerSnapshot.xmlAuthoring.readyPartCount, 3, "Operations should include comment XML authoring readiness")
      assertEqual(ownerSnapshot.mergePreview.safety?.conflictCount, 2, "Merge safety should count title and slide conflicts")
      assert(
        choices.some(
          (choice) =>
            choice.id === "pptx-comment-xml-authoring" && choice.enabled,
        ),
        "Owner export choices should include a ready comment XML authoring plan",
      )
      assert(report.includes("Owner export choices: 4/4 enabled"), "Serialized operations should include export choice readiness")
      assert(report.includes("Merge preview: conflict"), "Serialized operations should include merge preview status")
      assert(report.includes("PowerPoint thread plan: enabled"), "Serialized operations should list thread-plan export state")
      assert(report.includes("Role audit: needs-review"), "Serialized operations should include role-aware audit status")
    },
  },
  {
    name: "presence policy normalizes heartbeat slide ids and display initials",
    run() {
      assertEqual(
        resolvePresenceHeartbeat({ body: null }).slideId,
        null,
        "Missing heartbeat body should clear slide id",
      )
      assertEqual(
        resolvePresenceHeartbeat({ body: { slideId: "   " } }).slideId,
        null,
        "Blank slide ids should be normalized to null",
      )
      assertEqual(
        resolvePresenceHeartbeat({ body: { slideId: "  slide-3  " } }).slideId,
        "slide-3",
        "Slide ids should be trimmed before persistence",
      )
      assertEqual(
        presenceInitials({ email: "ava@example.com", name: "Ava Stone" }),
        "AS",
        "Two-part names should use two initials",
      )
      assertEqual(
        presenceInitials({ email: "solo@example.com", name: "Solo" }),
        "S",
        "Single names should use one initial",
      )
      assertEqual(
        presenceInitials({ email: "ma@example.com", name: "   " }),
        "MA",
        "Blank names should fall back to email initials",
      )
    },
  },
  {
    name: "notification policy normalizes mentions, previews, and dedupe windows",
    run() {
      assertEqual(
        cleanNotificationMentionKey(" @Ava+Stone! "),
        "avastone",
        "Mention keys should drop invalid punctuation and casing",
      )

      const keys = notificationMentionKeysForUser({
        email: "ava.stone@example.com",
        name: "Ava Stone",
      })

      assert(keys.has("ava.stone"), "Email local part should be a mention key")
      assert(keys.has("ava-stone"), "Dashed display name should be a mention key")
      assert(keys.has("avastone"), "Compacted display name should be a mention key")
      assertEqual(
        notificationCommentPreview("  Hello\n\nthere   team  "),
        "Hello there team",
        "Comment previews should collapse whitespace",
      )

      const longPreview = notificationCommentPreview("x".repeat(120))
      assertEqual(longPreview.length, 96, "Long comment previews should be capped")
      assert(
        longPreview.endsWith("..."),
        "Long comment previews should use an ellipsis",
      )
      assertEqual(
        shareViewDedupeCutoff(new Date("2026-05-14T00:15:00.000Z")).toISOString(),
        "2026-05-14T00:00:00.000Z",
        "Share-view dedupe cutoff should use the configured 15-minute window",
      )
    },
  },
  {
    name: "store persistence keeps hydration selections on valid slides and elements",
    run() {
      const deck = createDefaultDeck()
      const [firstSlide, secondSlide] = deck.slides

      assert(firstSlide && secondSlide, "Default deck should include two slides")

      const firstElement = {
        ...createElement("text"),
        id: "first-element",
      }
      const current: PresentationPersistenceState = {
        deck: {
          ...deck,
          slides: [
            { ...firstSlide, elements: [firstElement] },
            { ...secondSlide, elements: [] },
          ],
        },
        selectedSlideId: firstSlide.id,
        selectedSlideIds: [firstSlide.id],
        selectedElementId: firstElement.id,
        selectedElementIds: [firstElement.id],
        objectAnimationPreviewElementId: "previewing",
        objectAnimationPreviewKey: 9,
        collapsedSectionSlideIds: [firstSlide.id],
        zoom: 400,
        showGrid: true,
        showRulers: true,
        workspaceDensity: "compact",
        workspacePanelWidths: {
          filmstrip: 212,
          properties: 388,
        },
        workspacePanels: {
          filmstripOpen: false,
          propertiesOpen: true,
        },
        history: [deck],
        future: [deck],
      }

      const snapshot = createPresentationPersistenceSnapshot(current)
      const workspaceReport = workspaceErgonomicsReport({
        density: "focus",
        panelWidths: {
          filmstrip: 200,
          properties: 360,
        },
        panels: {
          filmstripOpen: false,
          propertiesOpen: false,
        },
      })

      assertEqual(snapshot.zoom, 140, "Persisted zoom should be capped")
      assertEqual(
        snapshot.workspaceDensity,
        "compact",
        "Persisted workspace density should be saved",
      )
      assertEqual(
        snapshot.workspacePanels.filmstripOpen,
        false,
        "Persisted filmstrip state should be saved",
      )
      assertEqual(
        snapshot.objectAnimationPreviewElementId,
        null,
        "Transient animation preview element should not persist",
      )
      assertEqual(snapshot.history.length, 0, "Undo history should not persist")
      assertEqual(snapshot.future.length, 0, "Redo history should not persist")

      const merged = mergePresentationPersistedState(
        {
          deck: current.deck,
          selectedSlideId: "missing-slide",
          selectedSlideIds: ["missing-slide", secondSlide.id],
          selectedElementId: "missing-element",
          selectedElementIds: ["missing-element"],
          collapsedSectionSlideIds: ["missing-slide", firstSlide.id],
          zoom: 10,
          showGrid: false,
          workspaceDensity: "invalid" as never,
          workspacePanelWidths: {
            filmstrip: 40,
            properties: 900,
          },
          workspacePanels: {
            filmstripOpen: true,
            propertiesOpen: "invalid" as never,
          },
        },
        current,
      )

      assertEqual(
        merged.selectedSlideId,
        firstSlide.id,
        "Invalid active slide should fall back to the current valid slide",
      )
      assertArrayEqual(
        merged.selectedSlideIds,
        [firstSlide.id],
        "Hydrated selected slides should include the valid active slide",
      )
      assertEqual(
        merged.selectedElementId,
        null,
        "Invalid selected element should be cleared",
      )
      assertArrayEqual(
        merged.collapsedSectionSlideIds,
        [firstSlide.id],
        "Collapsed section ids should be filtered to real slides",
      )
      assertEqual(merged.zoom, 45, "Hydrated zoom should be clamped")
      assertEqual(merged.showGrid, false, "Persisted boolean settings should apply")
      assertEqual(merged.showRulers, true, "Missing booleans should keep current values")
      assertEqual(
        merged.workspaceDensity,
        "compact",
        "Invalid workspace density should keep the current preference",
      )
      assertEqual(
        merged.workspacePanels.filmstripOpen,
        true,
        "Valid persisted workspace panel visibility should hydrate",
      )
      assertEqual(
        merged.workspacePanels.propertiesOpen,
        true,
        "Invalid workspace panel visibility should keep current preference",
      )
      assertEqual(
        snapshot.workspacePanelWidths.filmstrip,
        212,
        "Persisted filmstrip width should be saved",
      )
      assertEqual(
        merged.workspacePanelWidths.filmstrip,
        workspacePanelWidthLimits.filmstrip.min,
        "Too-small persisted filmstrip width should clamp to the minimum",
      )
      assertEqual(
        merged.workspacePanelWidths.properties,
        workspacePanelWidthLimits.properties.max,
        "Too-large persisted properties width should clamp to the maximum",
      )
      assertEqual(
        workspaceReport.status,
        "ready",
        "Workspace ergonomics report should confirm density and panel restore readiness",
      )
      assertEqual(
        workspaceReport.openPanelCount,
        0,
        "Workspace ergonomics report should count collapsed side panels",
      )
    },
  },
  {
    name: "editor nudge command clamps movement and ignores locked objects",
    run() {
      const movable = {
        ...createElement("shape"),
        id: "movable",
        x: 96,
        y: 96,
        width: 12,
        height: 12,
      }
      const locked = {
        ...createElement("shape"),
        id: "locked",
        x: 10,
        y: 10,
        width: 10,
        height: 10,
        locked: true,
      }
      const nudged = nudgeSlideElements(
        slideWithElements([movable, locked]),
        ["movable", "locked"],
        10,
        10,
      )

      assertEqual(nudged.elements[0]?.x, 88, "Nudged object should clamp to slide width")
      assertEqual(nudged.elements[0]?.y, 88, "Nudged object should clamp to slide height")
      assertEqual(nudged.elements[1]?.x, 10, "Locked object x position should not change")
      assertEqual(nudged.elements[1]?.y, 10, "Locked object y position should not change")
    },
  },
  {
    name: "editor marquee selection excludes hidden and locked objects",
    run() {
      const visible = {
        ...createElement("shape"),
        id: "visible",
        x: 10,
        y: 10,
        width: 10,
        height: 10,
      }
      const hidden = {
        ...visible,
        id: "hidden",
        hidden: true,
        x: 12,
      }
      const locked = {
        ...visible,
        id: "locked",
        locked: true,
        x: 14,
      }

      assertArrayEqual(
        elementIdsInRect(slideWithElements([visible, hidden, locked]), {
          left: 0,
          top: 0,
          right: 30,
          bottom: 30,
        }),
        ["visible"],
        "Marquee selection should include only visible editable objects",
      )
    },
  },
  {
    name: "editor align and distribute commands keep selected geometry predictable",
    run() {
      const first = {
        ...createElement("shape"),
        id: "first",
        x: 0,
        y: 10,
        width: 10,
        height: 10,
      }
      const middle = {
        ...first,
        id: "middle",
        x: 50,
      }
      const last = {
        ...first,
        id: "last",
        x: 80,
      }
      const aligned = alignSlideElements(
        slideWithElements([first, middle, last]),
        ["first", "middle", "last"],
        "top",
      )
      const distributed = distributeSlideElements(
        slideWithElements([first, middle, last]),
        ["first", "middle", "last"],
        "horizontal",
      )

      assertArrayEqual(
        aligned.elements.map((element) => element.y),
        [10, 10, 10],
        "Top alignment should keep all selected elements on the top edge",
      )
      assertEqual(distributed.elements[1]?.x, 40, "Middle element should move to even center spacing")
    },
  },
  {
    name: "editor resize and rotate patch commands preserve ids and safe bounds",
    run() {
      const first = {
        ...createElement("shape"),
        id: "first",
        x: 10,
        y: 20,
        width: 20,
        height: 10,
        rotation: 350,
      }
      const second = {
        ...createElement("shape"),
        id: "second",
        x: 40,
        y: 20,
        width: 20,
        height: 10,
      }
      const bounds = elementBounds([first, second])
      const resized = resizeElementPatches(
        [first, second],
        bounds,
        20,
        10,
        "bottom-right",
      )
      const rotated = rotateElementPatches([first], bounds, 30, 16 / 9)

      assertArrayEqual(
        resized.map((patch) => patch.id),
        ["first", "second"],
        "Resize patches should preserve selected element ids",
      )
      assertEqual(
        resized.every((patch) => Number(patch.patch.width) >= 4),
        true,
        "Resize patches should keep safe widths",
      )
      assertEqual(rotated[0]?.id, "first", "Rotate patch should preserve element id")
      assertEqual(rotated[0]?.patch.rotation, 20, "Rotation should normalize past 360 degrees")
    },
  },
  {
    name: "export filename helpers sanitize deck and slide titles",
    run() {
      const deck = {
        ...createDefaultDeck(),
        title: "  Launch: Q2 / 2026!! ",
      }
      const slide = {
        ...deck.slides[0],
        title: "Plan & Scope",
      }

      assertEqual(deckPdfFileName(deck), "launch-q2-2026.pdf", "PDF filename should be safe")
      assertEqual(deckPptxFileName(deck), "launch-q2-2026.pptx", "PPTX filename should be safe")
      assertEqual(
        deckPrintFileName(deck),
        "launch-q2-2026-slides-handout.html",
        "Handout filename should be safe",
      )
      assertEqual(slideSvgFileName(slide, 0), "01-plan-scope.svg", "SVG filename should be safe")
      assertEqual(slidePngFileName(slide, 11), "12-plan-scope.png", "PNG filename should include slide number")
    },
  },
  {
    name: "shape connector geometry preserves routed edit points",
    run() {
      const connector = {
        ...createElement("shape"),
        shapeKind: "elbowConnector",
        shapeConnectorControlX: 40,
        shapeConnectorControlY: 60,
        shapeConnectorEndX: 100,
        shapeConnectorEndY: 100,
        shapeConnectorStartX: 0,
        shapeConnectorStartY: 0,
      } satisfies PresentationElement
      const line = {
        ...createElement("shape"),
        shapeKind: "arrow",
        shapeConnectorEndX: 95,
        shapeConnectorEndY: 70,
        shapeConnectorStartX: 5,
        shapeConnectorStartY: 20,
      } satisfies PresentationElement

      assertEqual(
        shapeConnectorPath(
          "elbowConnector",
          { x: 0, y: 0, width: 100, height: 100 },
          shapeConnectorGeometry(connector),
        ),
        "M 0 0 L 40 0 L 40 60 L 100 60 L 100 100",
        "Elbow connector path should use explicit start control and end points",
      )
      assertEqual(
        shapeConnectorPath(
          "curvedConnector",
          { x: 10, y: 20, width: 80, height: 40 },
          shapeConnectorGeometry(connector),
        ),
        "M 10 20 Q 42 44 90 60",
        "Curved connector path should use the explicit quadratic control point",
      )
      assertEqual(
        JSON.stringify(
          shapeLineEndpoints(
            { x: 10, y: 20, width: 80, height: 40 },
            shapeConnectorGeometry(line),
          ),
        ),
        JSON.stringify({ x1: 14, x2: 86, y1: 28, y2: 48 }),
        "Line endpoints should use editable start and end point percentages",
      )
      const controlPoint = connectorPointPosition(connector, "control")
      assertEqual(
        `${controlPoint.x.toFixed(1)},${controlPoint.y.toFixed(1)}`,
        "31.2,44.8",
        "Canvas connector handles should project element-local control points",
      )
      assertEqual(
        JSON.stringify(
          connectorPointPatchFromPosition(line, "end", { x: 120, y: -10 }),
        ),
        JSON.stringify({ shapeConnectorEndX: 100, shapeConnectorEndY: 0 }),
        "Canvas connector drag patches should clamp edited points",
      )
    },
  },
  {
    name: "diagram authoring templates preserve PowerPoint conversion metadata",
    run() {
      const templateIds = diagramTemplates.map((template) => template.id)

      assert(
        templateIds.includes("matrix") && templateIds.includes("pyramid"),
        "Diagram gallery should include matrix and pyramid layouts",
      )

      const matrixSpecs = diagramElementSpecs("matrix")
      const pyramidSpecs = diagramElementSpecs("pyramid")
      const groupId = diagramGroupIdForTemplate("matrix", "matrix-1")
      const baseDeck = createDefaultDeck()
      const [firstSlide, ...restSlides] = baseDeck.slides

      assert(firstSlide, "Default deck should include a first slide")
      assertEqual(
        diagramTemplateIdFromGroupId(groupId),
        "matrix",
        "Diagram group ids should preserve the source template",
      )
      assert(
        matrixSpecs.filter((spec) => spec.type === "text").length >= 4,
        "Matrix diagrams should provide editable quadrant text slots",
      )
      assert(
        pyramidSpecs.some(
          (spec) =>
            spec.type === "shape" && spec.patch.shapeKind === "trapezoid",
        ),
        "Pyramid diagrams should use editable presentation shapes",
      )

      const deck: Deck = {
        ...baseDeck,
        slides: [
          {
            ...firstSlide,
            title: "Diagram review",
            elements: matrixSpecs.map((spec, index) => ({
              ...createElement(spec.type),
              ...spec.patch,
              groupId,
              id: `matrix-${index}`,
            })),
          },
          ...restSlides,
        ],
      }
      const diagramReport = deckDiagramAuthoringReport(deck)
      const serializedDiagramReport =
        serializeDiagramAuthoringReport(diagramReport)
      const nativeOfficeParity = nativeOfficePackageParityReport(deck)
      const nativeOfficeParityText =
        serializeNativeOfficePackageParityReport(nativeOfficeParity)
      const preflight = pptxExportPreflight(deck)
      const snapshotSections = pptxExportPreflightSnapshotSections(preflight)

      assertEqual(
        diagramReport.totalDiagramCount,
        1,
        "Diagram authoring report should count recognized diagram groups",
      )
      assertEqual(
        diagramReport.templateCoverageCount,
        1,
        "Diagram authoring report should count used template coverage",
      )
      assertEqual(
        diagramReport.items[0]?.officeLayout,
        "basicMatrix",
        "Diagram report should preserve PowerPoint target layout metadata",
      )
      assert(
        serializedDiagramReport.includes("Diagram authoring report") &&
          serializedDiagramReport.includes("basicMatrix"),
        "Serialized diagram reports should expose PowerPoint conversion metadata",
      )
      assert(
        nativeOfficeParity.sections.some(
          (section) =>
            section.id === "smartart-diagrams" &&
            section.status === "ready" &&
            section.readyCount === 1,
        ),
        "Native Office parity should treat recognized editable diagram groups as SmartArt conversion candidates",
      )
      assert(
        nativeOfficeParity.actions.some(
          (action) =>
            action.id === "complete-smartart-conversion-plan" &&
            action.status === "ready",
        ),
        "Native Office parity should mark the SmartArt conversion action ready for authored diagram groups",
      )
      assert(
        nativeOfficeParityText.includes("Native Office package parity report") &&
          nativeOfficeParityText.includes("SmartArt conversion plan"),
        "Serialized Native Office parity report should include SmartArt conversion planning",
      )
      assert(
        preflight.metrics.some(
          (metric) => metric.id === "diagram-layouts" && metric.value === "1",
        ),
        "PPTX preflight should count authored diagram layouts",
      )
      assert(
        preflight.metrics.some(
          (metric) =>
            metric.id === "diagram-template-coverage" &&
            metric.value === `1/${diagramTemplates.length}`,
        ),
        "PPTX preflight should expose diagram template coverage",
      )
      assert(
        preflight.metrics.some(
          (metric) =>
            metric.id === "diagram-conversion-groups" && metric.value === "1/1",
        ),
        "PPTX preflight should count editable diagram conversion groups",
      )
      assert(
        preflight.metrics.some(
          (metric) =>
            metric.id === "smartart-conversion-plan" && metric.value === "1/1",
        ),
        "PPTX preflight should expose SmartArt conversion planning from Native Office parity",
      )
      assert(
        snapshotSections
          .find((section) => section.title === "Diagram authoring")
          ?.metrics.some((metric) => metric.id === "diagram-layouts"),
        "Preflight snapshots should include diagram authoring metadata",
      )
      assert(
        snapshotSections
          .find((section) => section.title === "Native Office package parity")
          ?.metrics.some((metric) => metric.id === "smartart-conversion-plan"),
        "Preflight snapshots should include Native Office parity metadata",
      )
    },
  },
  {
    name: "pptx export preflight summarizes lossy PowerPoint handoff risks",
    run() {
      const readyReport = pptxExportPreflight(createDefaultDeck())

      assertEqual(
        readyReport.status,
        "ready",
        "Default deck should not produce PPTX export warnings",
      )

      const video = {
        ...createElement("video"),
        id: "video-1",
        animation: "fade",
        mediaCaptionCues: [
          {
            id: "caption-1",
            startSeconds: 0,
            endSeconds: 2,
            text: "Opening",
          },
        ],
        mediaStartSeconds: 1,
        src: "clip.mp4",
      } satisfies PresentationElement
      const image = {
        ...createElement("image"),
        id: "image-1",
        imageMask: "diamond",
        imageBrightness: 130,
        imagePositionX: 32,
      } satisfies PresentationElement
      const chart = {
        ...createElement("chart"),
        id: "chart-1",
        content: "Pipeline",
        rotation: 12,
      } satisfies PresentationElement
      const text = {
        ...createElement("text"),
        id: "text-1",
        listStyle: "bullet",
        textColumns: 2,
      } satisfies PresentationElement
      const table = {
        ...createElement("table"),
        id: "table-1",
        tableCellMerges: [
          { id: "merge-0-0", row: 0, column: 0, rowSpan: 1, columnSpan: 3 },
        ],
        tableCellStyles: [
          {
            id: "border-1",
            row: 1,
            column: 1,
            rowSpan: 1,
            columnSpan: 1,
            borderTopColor: "#ef4444",
          },
        ],
        tableOfficeStyleId: "{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}",
        tableOfficeStyleName: "Imported PowerPoint table style",
      } satisfies PresentationElement
      const connector = {
        ...createElement("shape"),
        id: "connector-1",
        shapeKind: "elbowConnector",
        shapeConnectorStartX: 5,
        shapeConnectorStartY: 10,
        shapeConnectorControlX: 40,
        shapeConnectorControlY: 70,
        shapeConnectorEndX: 92,
        shapeConnectorEndY: 80,
      } satisfies PresentationElement
      const baseDeck = createDefaultDeck()
      const [firstSlide, ...restSlides] = baseDeck.slides

      assert(firstSlide, "Default deck should include a first slide")

      const report = pptxExportPreflight({
        ...baseDeck,
        master: {
          ...baseDeck.master,
          showSlideNumbers: true,
        },
        slides: [
          {
            ...firstSlide,
            title: "Launch review",
            autoAdvanceAfterMs: 5000,
            transition: "fade",
            comments: [
              {
                id: "comment-1",
                authorName: "Ava",
                body: "Needs follow-up",
                createdAt: "",
                mentions: [],
                resolved: false,
                targetElementId: "",
                updatedAt: "",
              },
              {
                id: "comment-2",
                authorName: "Noor",
                body: "Imported reply context",
                createdAt: "",
                mentions: [],
                resolved: false,
                source: "pptx",
                sourceAnchor: { x: 18, y: 22 },
                sourceCommentId: "pptx-comment-2",
                sourceParentCommentId: "pptx-comment-1",
                sourceReplyDepth: 1,
                sourceReplyToAuthorName: "Ava",
                sourceThreadId: "pptx-thread-1",
                targetElementId: "",
                updatedAt: "",
              },
            ],
            elements: [
              video,
              image,
              chart,
              text,
              table,
              connector,
              {
                ...createElement("shape"),
                id: "shape-1",
                animation: "pulse",
                groupId: "group-1",
              },
              {
                ...createElement("shape"),
                id: "hidden-1",
                hidden: true,
              },
            ],
          },
          ...restSlides,
        ],
      })
      const issueIds = report.issues.map((issue) => issue.id)

      assertEqual(report.status, "attention", "Media and animations should require review")
      assert(issueIds.includes("media-placeholders"), "Media placeholders should be reported")
      assert(issueIds.includes("object-animations"), "Animations should be reported")
      assert(issueIds.includes("image-effects"), "Image effect simplifications should be reported")
      assert(issueIds.includes("chart-editability"), "Static chart export should be reported")
      assertEqual(
        pptxChartExportMode({ ...chart, rotation: 0 }).mode,
        "native",
        "Non-rotated charts should export as editable Office chart data",
      )
      assertEqual(
        pptxChartDataSeries(chart)[0]?.name,
        "Pipeline",
        "Native chart export should carry the Essence chart title",
      )
      assert(
        report.metrics.some(
          (metric) => metric.id === "chart-fallbacks" && metric.value === "1",
        ),
        "Preflight metrics should count static chart fallbacks",
      )
      assert(
        issueIds.includes("compatibility-repairs"),
        "Preflight should surface repair-oriented compatibility guidance",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "compatibility-repair-actions" && metric.value === "1",
        ),
        "Preflight metrics should count repair actions",
      )
      assert(
        report.issues
          .find((issue) => issue.id === "compatibility-repairs")
          ?.repairSteps?.some((step) => step.includes("chart data grid")),
        "Compatibility repair issues should include concrete chart repair steps",
      )
      assert(issueIds.includes("text-lists"), "Flattened list export should be reported")
      assert(issueIds.includes("text-columns"), "Column text export should be reported")
      assert(issueIds.includes("slide-transitions"), "Slide timing export should be reported")
      assert(issueIds.includes("comments"), "Comment handoff should be reported")
      assert(issueIds.includes("groups"), "Flattened groups should be reported")
      assert(issueIds.includes("hidden-objects"), "Hidden objects should be reported")
      assert(issueIds.includes("master-overlays"), "Master flattening should be reported")
      assert(
        report.summary.includes("lossy export blocker"),
        "Summary should explain lossy export blockers",
      )
      assert(
        report.metrics.some(
          (metric) => metric.id === "animation-cues" && metric.value === "2",
        ),
        "Preflight metrics should count animation handoff cues",
      )
      assert(
        report.metrics.some(
          (metric) => metric.id === "native-animation-xml" && metric.value === "1",
        ),
        "Preflight metrics should count stable native animation XML targets",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "native-exit-animation-xml" && metric.value === "0",
        ),
        "Preflight metrics should count native exit animation XML candidates",
      )
      assert(
        report.metrics.some(
          (metric) => metric.id === "animation-handoffs" && metric.value === "1",
        ),
        "Preflight metrics should keep unstable target-review animations visible",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "animation-target-reviews" && metric.value === "1",
        ),
        "Preflight metrics should count supported effects with unstable Office targets",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "office-action-animation-objects" &&
            metric.value === "1/2",
        ),
        "Preflight metrics should count exact action/animation object readiness",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "office-animation-target-reviews" &&
            metric.value === "1",
        ),
        "Preflight metrics should count exact native animation target reviews",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "office-advanced-animation-xml" &&
            metric.value === "1/0/0",
        ),
        "Preflight metrics should count native advanced animation XML targets",
      )
      assert(
        report.issues
          .find((issue) => issue.id === "object-animations")
          ?.repairSteps?.some(
            (step) => step.includes("[video-1]") && step.includes("single editable Office object"),
          ),
        "Animation preflight warnings should map target reviews to exact slide objects",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "office-emphasis-handoffs" && metric.value === "0",
        ),
        "Preflight metrics should stop counting stable emphasis effects as handoffs",
      )
      assert(
        report.metrics.some(
          (metric) => metric.id === "animation-kinds" && metric.value === "1/1/0/0",
        ),
        "Preflight metrics should summarize animation effect kinds",
      )
      assert(
        report.metrics.some(
          (metric) => metric.id === "native-tables" && metric.value === "1",
        ),
        "Preflight metrics should count native table exports",
      )
      assert(
        report.metrics.some(
          (metric) => metric.id === "merged-table-cells" && metric.value === "1",
        ),
        "Preflight metrics should count merged table cells",
      )
      assert(
        report.metrics.some(
          (metric) => metric.id === "office-table-styles" && metric.value === "1",
        ),
        "Preflight metrics should count retained Office table style metadata",
      )
      assert(
        report.metrics.some(
          (metric) => metric.id === "cell-border-variants" && metric.value === "1",
        ),
        "Preflight metrics should count selected-cell border variants",
      )
      assert(
        report.metrics.some(
          (metric) => metric.id === "connector-routes" && metric.value === "1",
        ),
        "Preflight metrics should count connector route handoff cues",
      )
      assert(
        report.metrics.some(
          (metric) => metric.id === "transition-cues" && metric.value === "1",
        ),
        "Preflight metrics should count transition handoff cues",
      )
      assert(
        report.metrics.some(
          (metric) => metric.id === "pptx-comment-threads" && metric.value === "1",
        ),
        "Preflight metrics should count imported PowerPoint comment threads",
      )
      assert(
        report.metrics.some(
          (metric) => metric.id === "pptx-comment-replies" && metric.value === "1",
        ),
        "Preflight metrics should count imported PowerPoint comment replies",
      )
      assert(
        report.metrics.some(
          (metric) => metric.id === "manual-comment-handoffs" && metric.value === "1",
        ),
        "Preflight metrics should count manual comment handoffs",
      )
      assert(
        report.metrics.some(
          (metric) => metric.id === "pptx-comment-anchors" && metric.value === "1/2",
        ),
        "Preflight metrics should count comment anchor readiness",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "pptx-comment-xml-parts" && metric.value === "3/3",
        ),
        "Preflight metrics should count authored comment XML parts",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "pptx-comment-xml-comments" && metric.value === "1",
        ),
        "Preflight metrics should count native comment XML candidates",
      )
      assert(
        report.metrics.some(
          (metric) =>
            metric.id === "media-source-candidates" && metric.value === "1/1",
        ),
        "Preflight metrics should count Office-compatible media source candidates",
      )
      assert(
        report.metrics.some(
          (metric) => metric.id === "native-media" && metric.value === "0",
        ),
        "Preflight metrics should avoid claiming local references as packaged media",
      )
      assert(
        report.metrics.some(
          (metric) => metric.id === "media-fallbacks" && metric.value === "1",
        ),
        "Preflight metrics should count media placeholder fallbacks",
      )
      assert(
        report.metrics.some(
          (metric) => metric.id === "media-caption-cues" && metric.value === "1",
        ),
        "Preflight metrics should count timed media caption cues",
      )
      assert(
        report.metrics.some(
          (metric) => metric.id === "media-trim-handoffs" && metric.value === "1",
        ),
        "Preflight metrics should count media trim handoffs",
      )
      const snapshot = serializePptxExportPreflightSnapshot(
        report,
        "Launch / Review",
      )
      const snapshotSections = pptxExportPreflightSnapshotSections(report)

      assert(
        snapshot.includes("PPTX preflight snapshot") &&
          snapshot.includes("Deck: Launch / Review") &&
          snapshot.includes("[attention] Some media becomes placeholders"),
        "Preflight snapshots should capture mixed fixture blockers in stable text",
      )
      assert(
          snapshot.includes("Native master/layout readiness:") &&
          snapshot.includes("Native Office package parity:") &&
          snapshot.includes("Compatibility repair plan:") &&
          snapshot.includes("Review comment XML:") &&
          snapshot.includes("Diagram authoring:") &&
          snapshot.includes("Action and animation metadata:") &&
          snapshot.includes("Chart and table fidelity:") &&
          snapshot.includes("Media packaging decisions:"),
        "Preflight snapshots should group export review and repair focus areas",
      )
      assertEqual(
        snapshotSections.length,
        8,
        "Preflight snapshots should expose repair, Office package parity, master, comment XML, diagram, action/animation, chart/table, and media sections",
      )
      assert(
        snapshotSections
          .find((section) => section.title === "Diagram authoring")
          ?.metrics.some((metric) => metric.id === "diagram-layouts"),
        "Diagram snapshot sections should include layout metadata",
      )
      assert(
        snapshotSections
          .find((section) => section.title === "Review comment XML")
          ?.metrics.some((metric) => metric.id === "pptx-comment-xml-parts"),
        "Comment XML snapshot sections should include authored comment package parts",
      )
      assert(
        snapshotSections
          .find((section) => section.title === "Compatibility repair plan")
          ?.metrics.some(
            (metric) => metric.id === "compatibility-repair-actions",
          ),
        "Repair snapshot sections should include compatibility repair actions",
      )
      assert(
        snapshotSections
          .find((section) => section.title === "Action and animation metadata")
          ?.metrics.some(
            (metric) => metric.id === "office-action-animation-objects",
          ),
        "Action/animation snapshot sections should include exact object readiness",
      )
      assert(
        snapshotSections
          .find((section) => section.title === "Chart and table fidelity")
          ?.metrics.some((metric) => metric.id === "chart-fallbacks"),
        "Chart/table snapshot sections should include chart fallback reasons",
      )
      assert(
        snapshotSections
          .find((section) => section.title === "Media packaging decisions")
          ?.metrics.some((metric) => metric.id === "media-fallbacks"),
        "Media snapshot sections should include packaging fallback reasons",
      )
      assertEqual(
        pptxExportPreflightSnapshotFileName(
          "Launch / Review",
          new Date("2026-05-15T00:00:00.000Z"),
        ),
        "launch-review-2026-05-15-pptx-preflight.txt",
        "Preflight snapshot filenames should be safe and date-stamped",
      )
    },
  },
  {
    name: "compatibility repair report guides linked charts and ODP table presets",
    run() {
      const baseDeck = createDefaultDeck()
      const [firstSlide, ...restSlides] = baseDeck.slides

      assert(firstSlide, "Default deck should include a first slide")

      const repairDeck = {
        ...baseDeck,
        slides: [
          {
            ...firstSlide,
            title: "Imported ODP review",
            elements: [
              {
                ...createElement("chart"),
                id: "linked-chart-1",
                rotation: 12,
              },
              {
                ...createElement("table"),
                id: "odp-table-1",
                tableStyle: "grid" as const,
              },
            ],
          },
          ...restSlides,
        ],
      }
      const odpReport = {
        id: "odp-report-1",
        importedAt: "2026-05-16T00:00:00.000Z",
        issues: [],
        metrics: [
          {
            id: "charts",
            label: "Charts",
            value: "2",
            detail: "0 local-table, 0 multi-series, 2 linked-data review",
          },
          {
            id: "tables",
            label: "Tables",
            value: "1",
            detail: "table:table objects import as editable Essence tables",
          },
        ],
        sourceFileName: "linked-source.odp",
        status: "warning",
        summary: "ODP preflight found linked chart data.",
        version: 1,
      } satisfies OdpImportPreflightReport
      const repair = compatibilityRepairReport(repairDeck, {
        odpImportReport: odpReport,
      })
      const interopPlan = officeInteroperabilityRepairPlan(repairDeck, {
        odpImportReport: odpReport,
      })
      const linkedDataWorkflow = linkedDataRepairWorkflowReport(repairDeck, {
        odpImportReport: odpReport,
      })
      const preflight = pptxExportPreflight(repairDeck, {
        odpImportReport: odpReport,
      })
      const snapshot = serializePptxExportPreflightSnapshot(
        preflight,
        "Imported ODP review",
      )
      const interopPlanText = serializeOfficeInteroperabilityRepairPlan(interopPlan)
      const linkedDataWorkflowText =
        serializeLinkedDataRepairWorkflowReport(linkedDataWorkflow)
      const repairLoop = importExportRepairLoopReport(repairDeck, {
        odpImportReport: odpReport,
      })
      const repairLoopText = serializeImportExportRepairLoopReport(repairLoop)

      assertEqual(
        repair.status,
        "warning",
        "Linked chart and ODP table preset gaps should produce repair warnings",
      )
      assertEqual(
        repair.repairActionCount,
        2,
        "Repair report should group linked chart and table preset actions",
      )
      assertEqual(
        repair.items.find((item) => item.id === "linked-chart-repair")?.count,
        3,
        "Linked chart repair should include linked-data sources and chart fallbacks",
      )
      assert(
        repair.items
          .find((item) => item.id === "odp-table-preset-repair")
          ?.repairSteps.some((step) => step.includes("table style preset")),
        "ODP table repair should guide users toward table preset cleanup",
      )
      assertEqual(
        interopPlan.actionCount,
        3,
        "Office interop planning should split linked data, chart editability, and table preset actions",
      )
      assertEqual(
        interopPlan.linkedChartDataCount,
        2,
        "Office interop planning should retain the linked chart data review count",
      )
      assertEqual(
        interopPlan.chartFallbackCount,
        1,
        "Office interop planning should count rotated chart editability fallbacks",
      )
      assertEqual(
        interopPlan.tablePresetFallbackCount,
        1,
        "Office interop planning should count ODP table preset mapping gaps",
      )
      assertEqual(
        interopPlan.tableStructureReadyCount,
        1,
        "Office interop planning should count native-ready table structures",
      )
      assert(
        interopPlan.actions.some(
          (action) =>
            action.id === "table-preset-mapping-repair" &&
            action.ownerAction.includes("closest table style preset"),
        ),
        "Office interop plan should include owner-visible table preset repair guidance",
      )
      assert(
        interopPlanText.includes("Office interoperability repair plan") &&
          interopPlanText.includes("Chart editability repair") &&
          interopPlanText.includes("Owner action: Set rotated charts"),
        "Office interop plan serialization should be copyable and action-oriented",
      )
      assertEqual(
        linkedDataWorkflow.status,
        "warning",
        "Linked-data workflow should elevate linked chart, chart fallback, and table style gaps",
      )
      assertEqual(
        linkedDataWorkflow.repairActionCount,
        3,
        "Linked-data workflow should split each owner-visible repair step",
      )
      assertEqual(
        linkedDataWorkflow.metrics.tableStructureFallbackCount,
        0,
        "Linked-data workflow should not create table structure fallbacks for native-ready tables",
      )
      assert(
        linkedDataWorkflow.steps.some(
          (step) =>
            step.actionType === "paste-data" &&
            step.ownerAction.includes("source workbook"),
        ),
        "Linked-data workflow should guide source workbook and worksheet-value repair",
      )
      assert(
        linkedDataWorkflow.steps.some(
          (step) =>
            step.actionType === "normalize-chart" &&
            step.slideTitles.includes("Imported ODP review"),
        ),
        "Linked-data workflow should keep slide-specific rotated chart repair context",
      )
      assert(
        linkedDataWorkflowText.includes("Linked data repair workflow") &&
          linkedDataWorkflowText.includes("Paste linked worksheet values") &&
          linkedDataWorkflowText.includes("Choose the closest table style preset"),
        "Linked-data workflow serialization should be copyable and action-oriented",
      )
      assertEqual(
        repairLoop.status,
        "warning",
        "Import/export repair loop should elevate owner-visible linked data and table repairs",
      )
      assertEqual(
        repairLoop.repairActionCount,
        4,
        "Import/export repair loop should include three repair steps plus final preflight verification",
      )
      assert(
        repairLoop.actions.some(
          (action) =>
            action.kind === "paste-linked-chart-data" &&
            action.nextCommand === "Open chart data grid",
        ),
        "Import/export repair loop should map linked chart data to a concrete chart-data command",
      )
      assert(
        repairLoop.actions.some(
          (action) =>
            action.kind === "apply-table-preset" &&
            action.ownerAction.includes("closest table style preset"),
        ),
        "Import/export repair loop should keep ODP table preset mapping actionable",
      )
      assert(
        repairLoop.metrics.some(
          (metric) => metric.id === "preflight-review-items",
        ),
        "Import/export repair loop should expose final PPTX preflight review metrics",
      )
      assert(
        repairLoopText.includes("Import/export repair loop") &&
          repairLoopText.includes("PPTX preflight") &&
          repairLoopText.includes("Next: Copy or download preflight snapshot"),
        "Import/export repair loop serialization should be copyable and export-review oriented",
      )
      assert(
        preflight.metrics.some(
          (metric) => metric.id === "office-interop-actions" && metric.value === "3",
        ),
        "PPTX preflight should include Office interop action metrics",
      )
      assert(
        preflight.metrics.some(
          (metric) =>
            metric.id === "linked-data-workflows" && metric.value === "1/4",
        ),
        "PPTX preflight should include linked-data workflow readiness metrics",
      )
      assert(
        preflight.metrics.some(
          (metric) =>
            metric.id === "linked-data-workflow-steps" && metric.value === "3",
        ),
        "PPTX preflight should include linked-data workflow step metrics",
      )
      assert(
        preflight.metrics.some(
          (metric) =>
            metric.id === "linked-chart-data-review" && metric.value === "2",
        ),
        "PPTX preflight should include linked chart data review metrics",
      )
      assert(
        preflight.metrics.some(
          (metric) =>
            metric.id === "chart-editability-repairs" && metric.value === "1",
        ),
        "PPTX preflight should include chart editability repair metrics",
      )
      assert(
        preflight.metrics.some(
          (metric) =>
            metric.id === "table-preset-mapping" && metric.value === "1",
        ),
        "PPTX preflight should include table preset mapping metrics",
      )
      assert(
        preflight.metrics.some(
          (metric) =>
            metric.id === "table-structure-readiness" && metric.value === "1/1",
        ),
        "PPTX preflight should include table structure readiness metrics",
      )
      assert(
        preflight.metrics.some(
          (metric) => metric.id === "linked-chart-repairs" && metric.value === "3",
        ),
        "PPTX preflight should include linked chart repair metrics",
      )
      assert(
        preflight.metrics.some(
          (metric) =>
            metric.id === "odp-table-preset-repairs" && metric.value === "1",
        ),
        "PPTX preflight should include ODP table preset repair metrics",
      )
      assert(
        preflight.issues
          .find((issue) => issue.id === "compatibility-repairs")
          ?.repairSteps?.some((step) => step.includes("source worksheet")),
        "PPTX preflight repair issue should carry concrete linked-data steps",
      )
      assert(
        snapshot.includes("Compatibility repair plan:") &&
          snapshot.includes("Office interop actions: 3") &&
          snapshot.includes("Linked data workflows: 1/4") &&
          snapshot.includes("Table structure readiness: 1/1") &&
          snapshot.includes("Repairs: Open each linked chart"),
        "Preflight snapshots should serialize repair-oriented steps",
      )
    },
  },
  {
    name: "pptx animation handoff notes preserve effect order and timing",
    run() {
      const slide = {
        ...createDefaultDeck().slides[0]!,
        elements: [
          {
            ...createElement("title"),
            id: "title-1",
            content: "Quarterly launch update",
            animation: "fade",
            animationDurationMs: 750,
            animationDelayMs: 125,
          },
          {
            ...createElement("shape"),
            id: "shape-1",
            animation: "wipe",
            animationTrigger: "afterPrevious",
            animationDurationMs: 1000,
            animationDelayMs: 0,
            shapeKind: "rightArrow",
          },
          {
            ...createElement("shape"),
            id: "shape-2",
            animation: "pulse",
            animationDurationMs: 650,
            animationDelayMs: 200,
            shapeKind: "star",
          },
          {
            ...createElement("shape"),
            id: "shape-3",
            animation: "fadeOut",
            animationDurationMs: 500,
            animationDelayMs: 50,
            shapeKind: "ellipse",
          },
          {
            ...createElement("text"),
            id: "hidden-text",
            animation: "rise",
            hidden: true,
          },
        ],
      } satisfies Slide
      const cues = slideAnimationHandoffCues(slide)
      const notes = serializePptxAnimationHandoffNotes(slide)
      const reviewDeck = {
        ...createDefaultDeck(),
        slides: [slide],
      }
      const officeReviewPlan = officeActionAnimationReviewPlan(reviewDeck)
      const officeReviewText =
        serializeOfficeActionAnimationReviewPlan(officeReviewPlan)

      assertEqual(cues.length, 4, "Hidden animated objects should not be exported as handoff cues")
      assertEqual(cues[0]?.label, "Quarterly launch update", "Text cues should use object text")
      assertEqual(cues[1]?.label, "Right arrow", "Shape cues should use shape labels")
      assertEqual(cues[1]?.trigger, "afterPrevious", "Handoff cues should preserve advanced trigger choices")
      assertEqual(cues[0]?.nativeSupport, "native-pptx-xml", "Entrance cues should be marked as native XML candidates")
      assertEqual(cues[1]?.effectKindLabel, "Entrance", "Handoff cues should preserve animation kind labels")
      assertEqual(cues[2]?.nativeSupport, "native-pptx-xml", "Advanced emphasis effects should be marked as native XML candidates")
      assertEqual(cues[2]?.effectKindLabel, "Emphasis", "Advanced effect cues should preserve kind labels")
      assertEqual(cues[3]?.nativeSupport, "native-pptx-xml", "Fade-out exit cues should be marked as native XML candidates")
      assertEqual(cues[3]?.effectKindLabel, "Exit", "Fade-out cues should preserve exit kind labels")
      assertEqual(
        officeReviewPlan.nativeAnimationXmlCount,
        4,
        "Office review planning should count native-ready animation XML targets",
      )
      assertEqual(
        officeReviewPlan.emphasisHandoffCount,
        0,
        "Office review planning should stop classifying stable emphasis effects as handoffs",
      )
      assertEqual(
        officeReviewPlan.exactObjectWarningCount,
        0,
        "Office review planning should avoid warnings for stable native animation targets",
      )
      assert(
        officeReviewPlan.animationItems.some(
          (item) =>
            item.elementId === "shape-2" &&
            item.catalogKind === "native-emphasis" &&
            item.objectRef.includes("[shape-2]"),
        ),
        "Office review planning should map native emphasis timing to exact object ids",
      )
      assert(
        notes.includes("1. Quarterly launch update - Fade (Entrance, native-pptx-xml); duration 750ms; delay 125ms; trigger on click."),
        "Animation notes should preserve the first cue timing and support path",
      )
      assert(
        notes.includes("2. Right arrow - Wipe (Entrance, native-pptx-xml); duration 1000ms; delay 0ms; trigger after previous."),
        "Animation notes should preserve ordered shape cues, kind labels, and trigger choices",
      )
      assert(
        notes.includes("3. Star - Pulse (Emphasis, native-pptx-xml); duration 650ms; delay 200ms; trigger on click."),
        "Animation notes should describe native advanced effects",
      )
      assert(
        notes.includes("4. Ellipse - Fade out (Exit, native-pptx-xml); duration 500ms; delay 50ms; trigger on click."),
        "Animation notes should describe native fade-out exit effects",
      )
      assert(
        officeReviewText.includes("Office action and animation review plan") &&
          officeReviewText.includes("Native emphasis timing") &&
          officeReviewText.includes("[shape-2]") &&
          officeReviewText.includes("p:timing native animation timeline"),
        "Serialized Office review should include advanced animation classes and native timing metadata",
      )
    },
  },
  {
    name: "animation pane orders, summarizes, and reorders visible effects",
    run() {
      const slide = {
        ...createDefaultDeck().slides[0]!,
        elements: [
          {
            ...createElement("title"),
            id: "title-1",
            content: "Quarterly launch update",
            animation: "fade",
            animationDurationMs: 750,
            animationDelayMs: 125,
          },
          {
            ...createElement("text"),
            id: "plain-text",
            content: "No animation",
            animation: "none",
          },
          {
            ...createElement("shape"),
            id: "shape-1",
            animation: "wipe",
            animationTrigger: "afterPrevious",
            animationDurationMs: 1000,
            animationDelayMs: 0,
            shapeKind: "rightArrow",
          },
          {
            ...createElement("text"),
            id: "hidden-text",
            animation: "rise",
            hidden: true,
          },
          {
            ...createElement("image"),
            id: "image-1",
            alt: "Roadmap screenshot",
            animation: "zoom",
            animationTrigger: "withPrevious",
            animationDurationMs: 500,
            animationDelayMs: 250,
          },
        ],
      } satisfies Slide

      const items = animationPaneItemsForSlide(slide, ["shape-1"])
      const summary = animationPaneSummary(slide)
      const moved = moveAnimatedElementInOrder(slide, "image-1", -1)
      const blocked = moveAnimatedElementInOrder(slide, "title-1", -1)

      assertArrayEqual(
        items.map((item) => item.elementId),
        ["title-1", "shape-1", "image-1"],
        "Animation pane should follow visible slideshow effect order",
      )
      assertEqual(items[1]?.selected, true, "Selected object should be flagged")
      assertEqual(
        items[1]?.triggerLabel,
        "After previous",
        "Animation pane should expose after-previous trigger choices",
      )
      assertEqual(
        items[2]?.triggerLabel,
        "With previous",
        "Animation pane should expose with-previous trigger choices",
      )
      assertEqual(summary.effectCount, 3, "Summary should count visible effects")
      assertEqual(summary.onClickCount, 1, "Summary should count click triggers")
      assertEqual(
        summary.withPreviousCount,
        1,
        "Summary should count with-previous triggers",
      )
      assertEqual(
        summary.afterPreviousCount,
        1,
        "Summary should count after-previous triggers",
      )
      assertEqual(
        summary.totalTimelineMs,
        2625,
        "Summary should total click-sequence timing",
      )
      assertEqual(
        summary.maxEffectMs,
        1000,
        "Summary should preserve the longest single effect timing",
      )
      assertEqual(moved.moved, true, "Reorder should report a changed slide")
      assertArrayEqual(
        moved.slide.elements.map((element) => element.id),
        ["title-1", "plain-text", "image-1", "shape-1", "hidden-text"],
        "Moving earlier should swap against the previous visible animation",
      )
      assertEqual(blocked.moved, false, "First animation cannot move earlier")
    },
  },
  {
    name: "advanced animation primitives sequence safely in slideshow playback",
    run() {
      const emphasisElement = {
        ...createElement("shape"),
        id: "pulse-1",
        animation: "pulse",
      } satisfies PresentationElement
      const exitElement = {
        ...createElement("shape"),
        id: "fade-out-1",
        animation: "fadeOut",
      } satisfies PresentationElement
      const motionElement = {
        ...createElement("shape"),
        id: "motion-1",
        animation: "motionRight",
      } satisfies PresentationElement
      const flyLeftElement = {
        ...createElement("shape"),
        id: "fly-left-1",
        animation: "flyLeft",
      } satisfies PresentationElement
      const growShrinkElement = {
        ...createElement("shape"),
        id: "grow-shrink-1",
        animation: "growShrink",
      } satisfies PresentationElement
      const teeterElement = {
        ...createElement("shape"),
        id: "teeter-1",
        animation: "teeter",
      } satisfies PresentationElement
      const exitDownElement = {
        ...createElement("shape"),
        id: "fade-out-down-1",
        animation: "fadeOutDown",
      } satisfies PresentationElement
      const motionLeftElement = {
        ...createElement("shape"),
        id: "motion-left-1",
        animation: "motionLeft",
      } satisfies PresentationElement
      const customMotionElement = {
        ...createElement("shape"),
        id: "custom-motion-1",
        animation: "motionCustom",
        animationMotionX: 32,
        animationMotionY: -16,
        animationTrigger: "withPrevious",
      } satisfies PresentationElement
      const afterPreviousExitElement = {
        ...createElement("shape"),
        id: "after-previous-exit-1",
        animation: "fadeOut",
        animationTrigger: "afterPrevious",
      } satisfies PresentationElement
      const sequenceSlide = {
        ...createDefaultDeck().slides[0]!,
        elements: [emphasisElement, customMotionElement, afterPreviousExitElement],
      } satisfies Slide

      assertEqual(elementAnimationLabels.flyLeft, "Fly in left", "Fly-left entrance should be exposed in authoring controls")
      assertEqual(elementAnimationLabels.growShrink, "Grow/shrink", "Grow/shrink emphasis should be exposed in authoring controls")
      assertEqual(elementAnimationLabels.motionCustom, "Custom motion", "Custom motion paths should be exposed in authoring controls")
      assertEqual(elementAnimationTriggerLabels.withPrevious, "With previous", "With-previous triggers should be exposed in authoring controls")
      assertEqual(elementAnimationKind(flyLeftElement.animation), "entrance", "Fly-left should be an entrance animation")
      assertEqual(elementAnimationKind(growShrinkElement.animation), "emphasis", "Grow/shrink should be an emphasis animation")
      assertEqual(elementAnimationKind(teeterElement.animation), "emphasis", "Teeter should be an emphasis animation")
      assertEqual(elementAnimationKind(exitDownElement.animation), "exit", "Fade-out-down should be an exit animation")
      assertEqual(elementAnimationKind(motionLeftElement.animation), "motion", "Motion-left should be a motion-path animation")
      assertEqual(elementAnimationKind(customMotionElement.animation), "motion", "Custom motion should be a motion-path animation")
      assertEqual(elementAnimationClass(flyLeftElement.animation), "object-animation-fly-left", "Fly-left should map to a preview class")
      assertEqual(elementAnimationClass(motionLeftElement.animation), "object-animation-motion-left", "Motion-left should map to a preview class")
      assertEqual(elementAnimationClass(customMotionElement.animation), "object-animation-motion-custom", "Custom motion should map to a preview class")
      assertEqual(elementAnimationMotionX(customMotionElement), 32, "Custom motion should preserve X offsets")
      assertEqual(elementAnimationMotionY(customMotionElement), -16, "Custom motion should preserve Y offsets")
      assertEqual(elementAnimationTrigger(customMotionElement), "withPrevious", "Custom motion should preserve trigger choices")
      assertArrayEqual(
        sequencedSlideElements(sequenceSlide).map((element) => element.id),
        ["pulse-1"],
        "Click sequencing should only count on-click animations",
      )

      assertEqual(
        shouldShowSequencedElement({
          animationStep: 0,
          element: emphasisElement,
          sequenceIndex: 0,
        }),
        true,
        "Emphasis animations should stay visible before their click trigger",
      )
      assertEqual(
        shouldPlaySequencedElementAnimation({
          animationStep: 1,
          element: emphasisElement,
          sequenceIndex: 0,
        }),
        true,
        "Emphasis animations should play on their sequence step",
      )
      assertEqual(
        shouldShowSequencedElement({
          animationStep: 1,
          element: exitElement,
          sequenceIndex: 0,
        }),
        true,
        "Exit animations should remain visible while their exit effect plays",
      )
      assertEqual(
        shouldShowSequencedElement({
          animationStep: 2,
          element: exitElement,
          sequenceIndex: 0,
        }),
        false,
        "Exit animations should be hidden after the exit step",
      )
      assertEqual(
        shouldPlaySequencedElementAnimation({
          animationStep: null,
          element: exitElement,
          sequenceIndex: 0,
        }),
        false,
        "Exit animations should not disappear immediately outside sequence mode",
      )
      assertEqual(
        shouldShowSequencedElement({
          animationStep: 0,
          element: motionElement,
          sequenceIndex: 1,
        }),
        true,
        "Motion-path animations should keep the object visible before movement",
      )
      assertEqual(
        shouldShowSequencedElement({
          animationStep: 2,
          element: exitDownElement,
          sequenceIndex: 0,
        }),
        false,
        "Additional exit variants should follow exit sequencing",
      )
      assertEqual(
        shouldPlaySequencedElementAnimation({
          animationStep: 2,
          element: motionLeftElement,
          sequenceIndex: 1,
        }),
        true,
        "Additional motion-path variants should play on their sequence step",
      )
      assertEqual(
        shouldPlaySequencedElementAnimation({
          animationStep: 0,
          element: customMotionElement,
          sequenceIndex: -1,
        }),
        true,
        "With-previous custom motion should auto-play when the slide sequence starts",
      )
      assertEqual(
        shouldShowSequencedElement({
          animationStep: 1,
          element: afterPreviousExitElement,
          sequenceIndex: -1,
        }),
        false,
        "After-previous exit animations should stay hidden after their automatic exit",
      )
    },
  },
  {
    name: "pptx native animation xml targets supported entrance and exit effects",
    run() {
      const baseDeck = createDefaultDeck()
      const [firstSlide] = baseDeck.slides

      assert(firstSlide, "Default deck should include a first slide")

      const slide = {
        ...firstSlide,
        elements: [
          {
            ...createElement("title"),
            id: "title-1",
            content: "Quarterly launch update",
            animation: "fade",
            animationDurationMs: 750,
            animationDelayMs: 125,
          },
          {
            ...createElement("shape"),
            id: "shape-1",
            animation: "rise",
            animationDurationMs: 1000,
            animationDelayMs: 0,
            linkUrl: "https://example.com",
            shapeKind: "rightArrow",
          },
          {
            ...createElement("shape"),
            id: "pulse-1",
            animation: "pulse",
            animationDurationMs: 700,
            animationDelayMs: 0,
          },
          {
            ...createElement("shape"),
            id: "spin-1",
            animation: "spin",
            animationDurationMs: 480,
            animationDelayMs: 15,
          },
          {
            ...createElement("shape"),
            id: "fade-out-1",
            animation: "fadeOut",
            animationDurationMs: 550,
            animationDelayMs: 75,
            shapeKind: "ellipse",
          },
          {
            ...createElement("shape"),
            id: "fade-out-down-1",
            animation: "fadeOutDown",
            animationDurationMs: 500,
            animationDelayMs: 40,
          },
          {
            ...createElement("shape"),
            id: "motion-right-1",
            animation: "motionRight",
            animationDurationMs: 900,
            animationDelayMs: 10,
          },
          {
            ...createElement("shape"),
            id: "motion-custom-1",
            animation: "motionCustom",
            animationDurationMs: 880,
            animationDelayMs: 25,
            animationMotionX: 32,
            animationMotionY: -16,
            animationTrigger: "withPrevious",
          },
          {
            ...createElement("text"),
            id: "text-1",
            animation: "zoom",
            animationDurationMs: 600,
            animationDelayMs: 250,
          },
          {
            ...createElement("text"),
            id: "multi-column-1",
            animation: "fade",
            content: "One\nTwo",
            textColumns: 2,
          },
        ],
      } satisfies Slide
      const deck = {
        ...baseDeck,
        slides: [slide],
      } satisfies Deck
      const slideXml = `<p:sld xmlns:p="${presentationNamespace}"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name="" /></p:nvGrpSpPr><p:sp><p:nvSpPr><p:cNvPr id="2" name="Text 0" /></p:nvSpPr></p:sp><p:sp><p:nvSpPr><p:cNvPr id="3" name="Shape 1" /></p:nvSpPr></p:sp><p:sp><p:nvSpPr><p:cNvPr id="4" name="Link overlay" /></p:nvSpPr></p:sp><p:sp><p:nvSpPr><p:cNvPr id="5" name="Pulse shape" /></p:nvSpPr></p:sp><p:sp><p:nvSpPr><p:cNvPr id="6" name="Spin shape" /></p:nvSpPr></p:sp><p:sp><p:nvSpPr><p:cNvPr id="7" name="Fade out shape" /></p:nvSpPr></p:sp><p:sp><p:nvSpPr><p:cNvPr id="8" name="Fade out down shape" /></p:nvSpPr></p:sp><p:sp><p:nvSpPr><p:cNvPr id="9" name="Motion shape" /></p:nvSpPr></p:sp><p:sp><p:nvSpPr><p:cNvPr id="10" name="Custom motion shape" /></p:nvSpPr></p:sp><p:sp><p:nvSpPr><p:cNvPr id="11" name="Text 2" /></p:nvSpPr></p:sp><p:sp><p:nvSpPr><p:cNvPr id="12" name="Column Text" /></p:nvSpPr></p:sp></p:spTree></p:cSld><p:clrMapOvr /></p:sld>`
      const targetPlan = nativePptxAnimationExportPlanForSlide(
        deck,
        slide,
        slideXml,
      )
      const targets = nativePptxAnimationTargetsForSlide(deck, slide, slideXml)
      const timingXml = nativePptxTimingXmlForTargets(targets)
      const preflight = pptxExportPreflight(deck)
      const result = applyNativePptxAnimationsToEntries(
        {
          "ppt/slides/slide1.xml": strToU8(
            slideXml.replace("</p:clrMapOvr>", "</p:clrMapOvr><p:timing />"),
          ),
        },
        deck,
      )
      const patchedXml = strFromU8(result.entries["ppt/slides/slide1.xml"]!)

      assertEqual(
        targets.length,
        9,
        "Supported entrance, emphasis, exit, and motion animations should map to native PPTX targets",
      )
      assertEqual(
        targetPlan.find((item) => item.elementId === "multi-column-1")?.status,
        "native-target-review",
        "Supported effects on multi-object fallback exports should stay in explicit target review",
      )
      assert(
        timingXml.includes('filter="fade"') &&
          timingXml.includes('<p:spTgt spid="2" />'),
        "Fade animation should target the first text object",
      )
      assert(
        timingXml.includes('filter="fly"') &&
          timingXml.includes('<p:spTgt spid="3" />'),
        "Rise animation should export as native fly-in on the shape object",
      )
      assert(
        timingXml.includes("<p:animScale>") &&
          timingXml.includes('<p:by x="108000" y="108000"/>') &&
          timingXml.includes('<p:spTgt spid="5" />'),
        "Pulse animation should export as native emphasis scale timing XML",
      )
      assert(
        timingXml.includes("<p:animRot>") &&
          timingXml.includes('<p:by val="21600000"/>') &&
          timingXml.includes('<p:spTgt spid="6" />'),
        "Spin animation should export as native emphasis rotation timing XML",
      )
      assert(
        timingXml.includes('<p:animEffect transition="out" filter="fade">') &&
          timingXml.includes('<p:spTgt spid="7" />'),
        "Fade-out animation should export as native exit timing XML",
      )
      assert(
        timingXml.includes('<p:animEffect transition="out" filter="fly">') &&
          timingXml.includes('<p:spTgt spid="8" />'),
        "Fade-out-down animation should export as native fly-out timing XML",
      )
      assert(
        timingXml.includes('<p:animMotion origin="layout" path="M 0 0 L 0.25 0"') &&
          timingXml.includes('<p:spTgt spid="9" />'),
        "Motion-right animation should export as native motion-path timing XML",
      )
      assert(
        timingXml.includes('<p:animMotion origin="layout" path="M 0 0 L 0.5 -0.25"') &&
          timingXml.includes('<p:spTgt spid="10" />'),
        "Custom motion animation should export as native editable motion-path XML",
      )
      assertEqual(
        targetPlan.find((item) => item.elementId === "motion-custom-1")?.trigger,
        "withPrevious",
        "Native animation export planning should preserve trigger choices",
      )
      assert(
        timingXml.includes('filter="zoom"') &&
          timingXml.includes('<p:spTgt spid="11" />'),
        "Text zoom animation should keep its stable native target after advanced effects",
      )
      assert(
        patchedXml.includes("<p:timing>") && !patchedXml.includes("<p:timing />"),
        "Native animation patch should replace stale timing XML",
      )
      assert(
        patchedXml.includes('<p:cond delay="125" />') &&
          patchedXml.includes('<p:cTn id="4" dur="750" fill="hold" />'),
        "Native animation XML should preserve delay and duration",
      )
      assert(
        preflight.metrics.some(
          (metric) =>
            metric.id === "office-animation-triggers" &&
            metric.value === "9/1/0",
        ),
        "PPTX preflight should summarize animation trigger choices",
      )
      assert(
        preflight.metrics.some(
          (metric) =>
            metric.id === "office-custom-motion-paths" && metric.value === "1",
        ),
        "PPTX preflight should count custom motion-path authoring",
      )
    },
  },
  {
    name: "pptx connector handoff notes preserve routed edit points",
    run() {
      const slide = {
        ...createDefaultDeck().slides[0]!,
        elements: [
          {
            ...createElement("shape"),
            id: "connector-1",
            shapeKind: "curvedConnector",
            shapeConnectorStartX: 5,
            shapeConnectorStartY: 12,
            shapeConnectorControlX: 42.25,
            shapeConnectorControlY: 48.75,
            shapeConnectorEndX: 91,
            shapeConnectorEndY: 64,
            shapeStrokeDash: "dash",
            shapeStartArrowhead: "oval",
            shapeEndArrowhead: "triangle",
          },
          {
            ...createElement("shape"),
            id: "hidden-connector",
            hidden: true,
            shapeKind: "elbowConnector",
          },
        ],
      } satisfies Slide
      const cues = slideConnectorHandoffCues(slide)
      const notes = serializePptxConnectorHandoffNotes(slide)

      assertEqual(
        cues.length,
        1,
        "Hidden connectors should not be exported as route handoff cues",
      )
      assertEqual(cues[0]?.controlX, 42.25, "Connector cue should preserve control X")
      assertEqual(cues[0]?.dash, "Dashed", "Connector cue should preserve dash style")
      assert(
        notes.includes(
          "1. Curved connector - start 5%,12%; control 42.3%,48.8%; end 91%,64%; start arrow Oval; end arrow Triangle; dash Dashed.",
        ),
        "Connector notes should preserve route points, arrowheads, and dash style",
      )
    },
  },
  {
    name: "pptx connector export uses editable custom geometry",
    async run() {
      const connector = {
        ...createElement("shape"),
        id: "connector-1",
        x: 96,
        y: 96,
        width: 384,
        height: 192,
        shapeKind: "curvedConnector",
        shapeConnectorStartX: 5,
        shapeConnectorStartY: 12,
        shapeConnectorControlX: 42.25,
        shapeConnectorControlY: 48.75,
        shapeConnectorEndX: 91,
        shapeConnectorEndY: 64,
        shapeStrokeDash: "dash",
        shapeStartArrowhead: "oval",
        shapeEndArrowhead: "triangle",
      } satisfies PresentationElement
      const points = pptxConnectorCustomGeometryPoints(connector, { h: 2, w: 4 })
      assert(points, "Connector export should create custom geometry points")
      const startPoint = points[0]
      const endPoint = points[1]
      assert(
        startPoint && "x" in startPoint && "y" in startPoint,
        "Curved connector should start with a move point",
      )
      assert(
        endPoint && "curve" in endPoint,
        "Curved connector should use a quadratic path point",
      )
      assert(
        endPoint.curve.type === "quadratic",
        "Curved connector should export a quadratic edit point",
      )
      assertEqual(startPoint.x, 0.2, "Connector start X should be frame-relative")
      assertEqual(startPoint.y, 0.24, "Connector start Y should be frame-relative")
      assertEqual(
        endPoint.curve.x1,
        1.69,
        "Connector control X should be frame-relative",
      )

      const baseDeck = createDefaultDeck()
      const firstSlide = baseDeck.slides[0]
      assert(firstSlide, "Default deck should include an opening slide")

      const deck = {
        ...baseDeck,
        slides: [
          {
            ...firstSlide,
            elements: [
              connector,
              {
                ...connector,
                id: "connector-2",
                shapeKind: "elbowConnector",
                shapeStartArrowhead: "none",
              },
            ],
          },
        ],
      } satisfies Deck
      const blob = await exportDeckToPptxBlob(deck)
      const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()))
      const slideXml = entries["ppt/slides/slide1.xml"]

      assert(slideXml, "PPTX export should include slide XML")

      const slideText = strFromU8(slideXml)
      assert(
        slideText.includes("<a:custGeom>") &&
          slideText.includes("<a:quadBezTo>") &&
          slideText.includes("<a:lnTo>"),
        "Connector export should author editable custom geometry paths",
      )
      assert(
        slideText.includes('<a:headEnd type="oval"/>') &&
          slideText.includes('<a:tailEnd type="triangle"/>'),
        "Connector export should preserve arrowhead metadata on custom geometry",
      )
      assert(
        !slideText.includes("<p:pic>"),
        "Connector export should not rasterize routed connectors as pictures",
      )
    },
  },
  {
    name: "pptx transition handoff notes preserve slide timing",
    run() {
      const slide = {
        ...createDefaultDeck().slides[0]!,
        transition: "push",
        transitionDurationMs: 625,
        autoAdvanceAfterMs: 8000,
      } satisfies Slide
      const cue = slideTransitionHandoffCue(slide)
      const notes = serializePptxTransitionHandoffNotes(slide)

      assertEqual(cue?.transition, "Push", "Transition cue should preserve transition kind")
      assertEqual(cue?.durationMs, 625, "Transition cue should preserve duration")
      assertEqual(cue?.autoAdvanceMs, 8000, "Transition cue should preserve auto-advance")
      assert(
        notes.includes("Transition Push; duration 625ms; auto-advance 8000ms."),
        "Transition notes should preserve duration and auto-advance timing",
      )
      assertEqual(
        slideTransitionHandoffCue({
          ...slide,
          transition: "none",
          autoAdvanceAfterMs: 0,
        }),
        null,
        "Slides without transition or auto-advance should not create handoff notes",
      )
    },
  },
  {
    name: "pptx native transition xml preserves supported slide timing",
    run() {
      const baseDeck = createDefaultDeck()
      const [firstSlide, secondSlide] = baseDeck.slides

      assert(firstSlide && secondSlide, "Default deck should include two slides")

      const deck = {
        ...baseDeck,
        slides: [
          {
            ...firstSlide,
            transition: "push",
            transitionDurationMs: 625,
            autoAdvanceAfterMs: 8000,
          },
          {
            ...secondSlide,
            transition: "none",
            autoAdvanceAfterMs: 6500,
          },
        ],
      } satisfies Deck
      const slideXml = `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="${presentationNamespace}"><p:cSld><p:spTree /></p:cSld><p:clrMapOvr><a:masterClrMapping /></p:clrMapOvr></p:sld>`
      const result = applyNativePptxTransitionsToEntries(
        {
          "ppt/slides/slide1.xml": strToU8(slideXml),
          "ppt/slides/slide2.xml": strToU8(
            slideXml.replace(
              "</p:clrMapOvr>",
              '</p:clrMapOvr><p:transition dur="300"><p:fade /></p:transition>',
            ),
          ),
        },
        deck,
      )
      const firstXml = strFromU8(result.entries["ppt/slides/slide1.xml"]!)
      const secondXml = strFromU8(result.entries["ppt/slides/slide2.xml"]!)
      const firstTransition = pptxSlideTransitionFromXml(firstXml)
      const secondTransition = pptxSlideTransitionFromXml(secondXml)

      assert(result.changed, "Native transition XML patch should report changed entries")
      assert(
        firstXml.includes(
          '<p:transition dur="625" advClick="1" advTm="8000"><p:push dir="l" /></p:transition>',
        ),
        "Native PPTX transition XML should include supported push timing",
      )
      assertEqual(
        firstTransition.transition,
        "push",
        "Exported native transition XML should round-trip through the importer",
      )
      assertEqual(
        firstTransition.autoAdvanceAfterMs,
        8000,
        "Exported native transition XML should preserve auto advance",
      )
      assertEqual(
        secondTransition.transition,
        "none",
        "Timing-only native transition XML should replace stale visual transitions",
      )
      assertEqual(
        secondTransition.autoAdvanceAfterMs,
        6500,
        "Timing-only native transition XML should preserve auto advance",
      )
      assertEqual(
        nativePptxTransitionXmlForSlide({
          ...firstSlide,
          transition: "none",
          autoAdvanceAfterMs: 0,
        }),
        "",
        "Slides without transition timing should not receive transition XML",
      )
    },
  },
  {
    name: "table merge helpers preserve spans for canvas export and validation",
    run() {
      const table = {
        ...createElement("table"),
        id: "merge-table",
        tableCells: ["Roadmap", "Q1", "Q2", "Design", "Build", "Ship"],
        tableColumns: 3,
        tableRows: 2,
      } satisfies PresentationElement
      const merged = {
        ...table,
        ...mergeTableCells(table, {
          row: 0,
          column: 0,
          rowSpan: 1,
          columnSpan: 3,
        }),
      } satisfies PresentationElement
      const cells = tableDisplayCells(merged)

      assertEqual(tableCellMerges(merged).length, 1, "Header merge should be stored")
      assertEqual(cells.length, 4, "Covered cells should not render as separate cells")
      assertEqual(cells[0]?.columnSpan, 3, "Header cell should span all columns")
      assertEqual(cells[0]?.text, "Roadmap", "Merged cells should keep anchor text")

      const resized = {
        ...merged,
        ...resizeTableCells(merged, 2, 2),
      } satisfies PresentationElement
      assertEqual(
        tableCellMerges(resized)[0]?.columnSpan,
        2,
        "Resizing should clamp merge spans to the new grid",
      )

      const split = {
        ...merged,
        ...splitTableCells(merged),
      } satisfies PresentationElement
      assertEqual(tableCellMerges(split).length, 0, "Split all should remove merges")

      const parsed = parseDeckPayload({
        deck: {
          ...createDefaultDeck(),
          slides: [
            {
              ...createDefaultDeck().slides[0]!,
              elements: [
                {
                  ...merged,
                  tableCellMerges: [
                    ...tableCellMerges(merged),
                    {
                      id: "overlap",
                      row: 0,
                      column: 1,
                      rowSpan: 2,
                      columnSpan: 2,
                    },
                  ],
                },
              ],
            },
          ],
        },
      })
      const parsedTable = parsed?.slides[0]?.elements[0]

      assert(parsedTable, "Parsed deck should keep the table")
      assertEqual(
        tableCellMerges(parsedTable).length,
        1,
        "Server validation should reject overlapping table merges",
      )
    },
  },
  {
    name: "table cell range helpers edit selected cells and selected formatting",
    run() {
      const table = {
        ...createElement("table"),
        id: "range-table",
        tableCells: [
          "Roadmap",
          "Q1",
          "Q2",
          "Design",
          "Build",
          "Ship",
          "Review",
          "Launch",
          "Report",
        ],
        tableColumns: 3,
        tableRows: 3,
      } satisfies PresentationElement
      const range = normalizeTableCellRange(table, {
        row: 1,
        column: 1,
        rowSpan: 8,
        columnSpan: 8,
      })

      assertEqual(range.rowSpan, 2, "Selection range should clamp row span")
      assertEqual(range.columnSpan, 2, "Selection range should clamp column span")
      assertEqual(
        tableCellRangeLabel(table, range),
        "R2C2:R3C3",
        "Selection label should match PowerPoint-style row and column coordinates",
      )
      assertEqual(
        tableCellsToTsvForRange(table, range),
        "Build\tShip\nLaunch\tReport",
        "Selected cell TSV should only serialize the active range",
      )

      const edited = {
        ...table,
        ...updateTableCellsInRange(table, range, "Prototype\tShip\nDemo\tClose"),
      } satisfies PresentationElement

      assertEqual(
        tableCellsToTsvForRange(edited, range),
        "Prototype\tShip\nDemo\tClose",
        "Selected range edits should update only the chosen cells",
      )
      assertEqual(
        edited.tableCells[0],
        "Roadmap",
        "Selected range edits should preserve cells outside the range",
      )

      const styled = {
        ...edited,
        ...applyTableCellStyleToRange(edited, range, {
          background: "#fef3c7",
          borderColor: "#f59e0b",
          color: "#111827",
          fontWeight: 700,
        }),
      } satisfies PresentationElement
      const anchorFormat = tableCellFormat(styled, 1, 1)

      assertEqual(
        tableCellRangeStyleCount(styled, range),
        1,
        "Selected range formatting should store one bounded style override",
      )
      assertEqual(
        tableCellStyles(styled)[0]?.columnSpan,
        2,
        "Selected range formatting should preserve the selected column span",
      )
      assertEqual(
        anchorFormat.background,
        "#fef3c7",
        "Selected cell formatting should override style preset background",
      )
      assertEqual(
        anchorFormat.fontWeight,
        700,
        "Selected cell formatting should override style preset text weight",
      )

      const bordered = {
        ...styled,
        ...applyTableCellBorderToRange(styled, range, "outer", "#ef4444"),
      } satisfies PresentationElement
      const topLeftBorder = tableCellFormat(bordered, 1, 1)
      const bottomRightBorder = tableCellFormat(bordered, 2, 2)
      assertEqual(
        tableCellRangeStyleCount(bordered, range),
        4,
        "Selected border variants should store cell-specific edge overrides",
      )
      assertEqual(
        topLeftBorder.borderTopColor,
        "#ef4444",
        "Selected outer border should update the top edge",
      )
      assertEqual(
        topLeftBorder.borderRightColor,
        "#f59e0b",
        "Selected outer border should preserve interior cell borders",
      )
      assertEqual(
        bottomRightBorder.borderBottomColor,
        "#ef4444",
        "Selected outer border should update the bottom edge",
      )
      const parsedBordered = parseDeckPayload({
        deck: {
          ...createDefaultDeck(),
          slides: [
            {
              ...createDefaultDeck().slides[0]!,
              elements: [
                {
                  ...bordered,
                  tableOfficeStyleId: "{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}",
                  tableOfficeStyleName: "Imported PowerPoint table style",
                },
              ],
            },
          ],
        },
      })?.slides[0]?.elements[0]

      assert(parsedBordered, "Parsed deck should preserve the bordered table")
      assertEqual(
        parsedBordered.tableOfficeStyleId,
        "{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}",
        "Server validation should preserve imported Office table style ids",
      )
      assertEqual(
        tableCellFormat(parsedBordered, 1, 1).borderTopColor,
        "#ef4444",
        "Server validation should preserve selected-cell border side overrides",
      )

      const merged = {
        ...styled,
        ...mergeTableCellRange(styled, range),
      } satisfies PresentationElement
      assertEqual(
        tableCellRangeMergeCount(merged, range),
        1,
        "Selected range merge should create one merge record",
      )

      const split = {
        ...merged,
        ...splitTableCellRange(merged, range),
      } satisfies PresentationElement
      assertEqual(
        tableCellRangeMergeCount(split, range),
        0,
        "Selected range split should remove merges intersecting the range",
      )

      const cleared = {
        ...split,
        ...clearTableCellStyleRange(split, range),
      } satisfies PresentationElement
      assertEqual(
        tableCellRangeStyleCount(cleared, range),
        0,
        "Selected range style clearing should remove intersecting style overrides",
      )
    },
  },
  {
    name: "object conversion report classifies PowerPoint handoff editability",
    run() {
      const readyReport = objectConversionReport(createDefaultDeck())

      assertEqual(
        readyReport.status,
        "ready",
        "Default deck objects should be PowerPoint-friendly",
      )

      const baseDeck = createDefaultDeck()
      const [firstSlide, ...restSlides] = baseDeck.slides

      assert(firstSlide, "Default deck should include a first slide")

      const report = objectConversionReport({
        ...baseDeck,
        slides: [
          {
            ...firstSlide,
            title: "Object handoff",
            elements: [
              {
                ...createElement("shape"),
                id: "connector-1",
                shapeKind: "elbowConnector",
              },
              {
                ...createElement("shape"),
                id: "bubble-1",
                shapeKind: "speechBubble",
              },
              {
                ...createElement("video"),
                id: "video-1",
                src: "clip.mp4",
              },
              {
                ...createElement("audio"),
                id: "audio-native-1",
                src: "data:audio/mpeg;base64,AAAA",
              },
              {
                ...createElement("chart"),
                id: "chart-1",
                rotation: 12,
              },
              {
                ...createElement("icon"),
                id: "icon-1",
              },
              {
                ...createElement("table"),
                id: "table-1",
                rotation: 8,
              },
              {
                ...createElement("image"),
                id: "image-1",
                imageMask: "circle",
                imageOpacity: 70,
              },
              {
                ...createElement("text"),
                id: "text-1",
                listStyle: "number",
                textColumns: 2,
              },
              {
                ...createElement("shape"),
                id: "grouped-1",
                animation: "fade",
                groupId: "group-1",
              },
              {
                ...createElement("shape"),
                id: "hidden-1",
                hidden: true,
              },
            ],
          },
          ...restSlides,
        ],
      })
      const issueIds = report.issues.map((issue) => issue.id)

      assertEqual(
        report.status,
        "attention",
        "Placeholders, hidden objects, and animation metadata should need review",
      )
      assertEqual(report.totalObjectCount, 13, "Report should include all deck objects")
      assertEqual(
        report.placeholderObjectCount,
        1,
        "Only unresolved media objects should be classified as placeholders",
      )
      assert(
        report.nativeObjectCount >= 2,
        "Supported inline media should be classified as native-like",
      )
      assertEqual(
        report.skippedObjectCount,
        1,
        "Hidden objects should be classified as skipped",
      )
      assert(
        report.simplifiedObjectCount >= 6,
        "Connector, chart, icon, rotated table, image, and text objects should be simplified",
      )
      assert(
        issueIds.includes("connector-artwork"),
        "Connector live-binding limitations should be reported",
      )
      assert(
        !issueIds.includes("custom-shape-artwork"),
        "Speech bubbles should export as native Office callout shapes",
      )
      assert(issueIds.includes("media-placeholder"), "Media placeholders should be reported")
      assert(issueIds.includes("chart-artwork"), "Chart artwork should be reported")
      assert(issueIds.includes("icon-svg"), "SVG icon export should be reported")
      assert(issueIds.includes("table-grid"), "Rotated table fallback should be reported")
      assert(issueIds.includes("image-effects"), "Image effects should be reported")
      assert(issueIds.includes("text-layout"), "Text layout flattening should be reported")
      assert(issueIds.includes("group-flattening"), "Group flattening should be reported")
      assert(issueIds.includes("animation-metadata"), "Animation metadata should be reported")
      assert(issueIds.includes("hidden-skipped"), "Hidden skipped objects should be reported")
    },
  },
  {
    name: "section export summaries group print and handout metadata",
    run() {
      const baseDeck = createDefaultDeck()
      const [firstSlide, secondSlide] = baseDeck.slides
      assert(firstSlide && secondSlide, "Default deck should include two slides")

      const deck: Deck = {
        ...baseDeck,
        title: "Section <Deck>",
        slides: [
          {
            ...firstSlide,
            id: "intro",
            title: "Intro",
            sectionTitle: "Launch <Plan>",
            notes: "Opening note",
            comments: [
              {
                id: "comment-1",
                body: "Open",
                authorName: "Ava",
                targetElementId: "",
                mentions: [],
                resolved: false,
                createdAt: "",
                updatedAt: "",
              },
            ],
          },
          {
            ...secondSlide,
            id: "detail",
            title: "Detail",
            sectionTitle: "",
            elements: [
              {
                ...createElement("video"),
                id: "video",
              },
            ],
          },
          {
            ...createSlide(3),
            id: "close",
            title: "Close",
            sectionTitle: "Closeout",
          },
        ],
      }

      const summary = sectionExportSummary(deck)
      assertEqual(summary.explicitSectionCount, 2, "Named sections should count")
      assertEqual(
        summary.groupedSlideCount,
        3,
        "Section summary should count slides inside named sections",
      )
      assertEqual(
        summary.noteSlideCount,
        1,
        "Section summary should count slides with notes",
      )
      assertEqual(
        summary.openCommentCount,
        1,
        "Section summary should count open comments",
      )
      assertEqual(
        summary.mediaObjectCount,
        1,
        "Section summary should count media objects",
      )

      const html = serializeDeckToPrintHtml(deck, {
        layout: "outline",
        orientation: "landscape",
        includeNotes: true,
        includeComments: true,
        includeSlideNumbers: true,
        includeDate: false,
      })

      assert(
        html.includes("Launch &lt;Plan&gt;"),
        "Print section summaries should escape section names",
      )
      assert(
        html.includes("Slides 1-2"),
        "Print section summaries should include section slide ranges",
      )
      assert(
        html.includes("2 sections group 3 slides"),
        "Print outline should include section handoff summary text",
      )
    },
  },
  {
    name: "media caption cues parse timed text and feed presenter handoff",
    run() {
      const cues = parseMediaCaptionCues(`WEBVTT

1
00:00:00.000 --> 00:00:03.500
Opening caption

2
00:00:04,000 --> 00:00:07,000
Second caption`)
      const video = {
        ...createElement("video"),
        id: "captioned-video",
        mediaCaption: "",
        mediaCaptionCues: cues,
      } satisfies PresentationElement
      const slide = {
        ...createSlide(1),
        elements: [video],
      }
      const deck = {
        ...createDefaultDeck(),
        slides: [
          {
            ...slide,
            notes: "Presenter note with clear delivery cue.",
            rehearsalDurationMs: 30_000,
          },
        ],
      }
      const report = presenterReadinessReport(deck, {
        audienceChannelAvailable: true,
        audienceDisplayState: "connected",
        blankMode: "none",
        captionsVisible: true,
        fullscreenAvailable: true,
      })
      const serialized = serializeMediaCaptionVtt(cues)
      const notes = serializeMediaCaptionHandoffNotes(slide)

      assertEqual(cues.length, 2, "VTT/SRT parser should import timed cues")
      assert(
        serialized.includes("00:00:03.500"),
        "Timed caption serialization should preserve fractional seconds",
      )
      assertEqual(
        mediaCaptionCues(video)[1]?.text,
        "Second caption",
        "Caption cue normalization should preserve cue text",
      )
      assert(
        notes.includes("Timed media captions"),
        "PPTX handoff notes should include timed media caption metadata",
      )
      assertEqual(
        report.metrics.find((metric) => metric.id === "media")?.detail,
        "1/1 captioned",
        "Presenter readiness should count timed cues as media captions",
      )
    },
  },
  {
    name: "media handoff readiness classifies native candidates and recording APIs",
    run() {
      const nativeVideo = {
        ...createElement("video"),
        id: "native-video",
        src: "data:video/mp4;base64,AAAA",
      } satisfies PresentationElement
      const remoteAudio = {
        ...createElement("audio"),
        id: "remote-audio",
        mediaAutoplay: true,
        src: "https://cdn.example.com/talk.mp3",
      } satisfies PresentationElement
      const missingVideo = {
        ...createElement("video"),
        id: "missing-video",
        src: "",
      } satisfies PresentationElement
      const trimmedCaptionedVideo = {
        ...nativeVideo,
        id: "trimmed-captioned-video",
        mediaCaptionCues: [
          {
            id: "cue-before-trim",
            startSeconds: 1,
            endSeconds: 2,
            text: "Too early",
          },
          {
            id: "cue-inside-trim",
            startSeconds: 5,
            endSeconds: 7,
            text: "Aligned",
          },
        ],
        mediaEndSeconds: 8,
        mediaStartSeconds: 4,
      } satisfies PresentationElement
      const deck = {
        ...createDefaultDeck(),
        slides: [
          {
            ...createSlide(1),
            elements: [nativeVideo, remoteAudio, missingVideo],
          },
        ],
      }
      const report = deckMediaHandoffReport(deck)
      const nativeReport = mediaHandoffReport(nativeVideo)
      const remoteReport = mediaHandoffReport(remoteAudio)
      const editingReview = mediaEditingReview(trimmedCaptionedVideo)
      const recordingReady = mediaRecordingReadiness({
        displayMedia: true,
        mediaRecorder: true,
        userMedia: true,
      })

      assertEqual(
        mediaSourceKind(nativeVideo),
        "inline",
        "Data URL media should be classified as inline source",
      )
      assert(
        isNativeMediaSourceCandidate(nativeVideo),
        "MP4 video data URL should be a native embedding source candidate",
      )
      assert(
        isNativePptxMediaEmbeddable(nativeVideo),
        "Compatible inline base64 media should be directly embeddable in PPTX",
      )
      assertEqual(
        nativeReport.status,
        "ready",
        "Compatible inline media without trim/autoplay/captions should be native-ready",
      )
      assertEqual(
        nativeReport.currentPptxMode,
        "native",
        "Ready inline media should report native PPTX mode",
      )
      assertEqual(
        remoteReport.status,
        "warning",
        "Remote media should be usable but flagged for local file handoff",
      )
      assertEqual(
        remoteReport.currentPptxMode,
        "placeholder",
        "Remote media should keep a compatibility placeholder until localized",
      )
      assertEqual(
        editingReview.status,
        "attention",
        "Media editing review should flag captions outside the trim range",
      )
      assert(
        editingReview.presenterHandoffSummary.includes("2 timed caption cues"),
        "Media editing review should summarize presenter caption handoff",
      )
      assertEqual(
        report.totalMediaCount,
        3,
        "Deck media handoff report should count visible media objects",
      )
      assertEqual(
        report.nativeSourceCandidateCount,
        2,
        "Deck media handoff report should count compatible audio/video sources",
      )
      assertEqual(
        report.nativePptxEmbeddingCount,
        1,
        "Deck media handoff report should count inline native PPTX media",
      )
      assertEqual(
        report.placeholderCount,
        2,
        "Deck media handoff report should count media needing fallback placeholders",
      )
      assertEqual(
        report.attentionCount,
        1,
        "Deck media handoff report should flag missing media sources",
      )
      assertEqual(
        recordingReady.status,
        "ready",
        "Recording readiness should detect complete capture API support",
      )
    },
  },
  {
    name: "media recording helpers choose capture modes and filenames safely",
    run() {
      const supportedTypes = new Set([
        "audio/webm;codecs=opus",
        "video/webm",
      ])
      const support = (mimeType: string) => supportedTypes.has(mimeType)
      const readyRuntime = {
        displayMedia: true,
        mediaRecorder: true,
        userMedia: true,
      }
      const partialRuntime = {
        displayMedia: false,
        mediaRecorder: true,
        userMedia: true,
      }
      const unsupportedRuntime = {
        displayMedia: true,
        mediaRecorder: false,
        userMedia: true,
      }

      assertEqual(
        mediaRecordingOutputType("audio"),
        "audio",
        "Audio recording mode should create audio objects",
      )
      assertEqual(
        mediaRecordingOutputType("camera"),
        "video",
        "Camera recording mode should create video objects",
      )
      assertEqual(
        mediaRecordingReplacementPlan("audio", "audio").canReplace,
        true,
        "Audio recordings should replace a selected audio object",
      )
      assertEqual(
        mediaRecordingReplacementPlan("screen", "audio").actionLabel,
        "Insert new",
        "Video recordings should not replace selected audio objects",
      )
      assertEqual(
        preferredMediaRecordingMimeType("audio", support),
        "audio/webm;codecs=opus",
        "Audio recording should choose the first supported MIME type",
      )
      assertEqual(
        preferredMediaRecordingMimeType("screen", support),
        "video/webm",
        "Screen recording should fall back to supported video MIME types",
      )
      assertEqual(
        mediaRecordingModeReadiness(readyRuntime, "screen").disabled,
        false,
        "Screen recording should be ready when display capture is available",
      )
      assertEqual(
        mediaRecordingModeReadiness(partialRuntime, "screen").disabled,
        true,
        "Screen recording should be disabled without display capture",
      )
      assertEqual(
        mediaRecordingModeReadiness(unsupportedRuntime, "audio").disabled,
        true,
        "Recording should be disabled without MediaRecorder",
      )
      assertEqual(
        mediaRecordingFileName(
          "camera",
          new Date(2026, 4, 15, 9, 8, 7),
          "video/webm",
        ),
        "recorded-camera-20260515-090807.webm",
        "Recording filenames should be deterministic and extension-aware",
      )
      assertEqual(
        mediaRecordingDurationLabel(65_200),
        "1:05",
        "Recording duration labels should be mm:ss",
      )
    },
  },
  {
    name: "pptx native media export packages supported inline sources",
    async run() {
      const nativeVideo = {
        ...createElement("video"),
        id: "native-export-video",
        alt: "Launch clip",
        src: "data:video/mp4;base64,AAAA",
      } satisfies PresentationElement
      const remoteAudio = {
        ...createElement("audio"),
        id: "remote-export-audio",
        alt: "Narration",
        src: "https://cdn.example.com/narration.mp3",
      } satisfies PresentationElement
      const slide = {
        ...createSlide(1),
        elements: [nativeVideo, remoteAudio],
      } satisfies Slide
      const deck = {
        ...createDefaultDeck(),
        slides: [slide],
      } satisfies Deck
      const nativeOnlyDeck = {
        ...deck,
        slides: [
          {
            ...slide,
            elements: [nativeVideo],
          },
        ],
      } satisfies Deck
      const decision = pptxMediaExportDecision(nativeVideo)
      const report = deckPptxMediaExportReport(deck)
      const nativeOnlyPreflight = pptxExportPreflight(nativeOnlyDeck)
      const handoffNotes = serializePptxMediaExportHandoffNotes(slide)
      const blob = await exportDeckToPptxBlob(deck)
      const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()))
      const mediaEntryNames = Object.keys(entries).filter((name) =>
        name.startsWith("ppt/media/"),
      )
      const slideRels = entries["ppt/slides/_rels/slide1.xml.rels"]

      assertEqual(
        decision.mode,
        "native",
        "Supported inline MP4 video should choose native PPTX export mode",
      )
      assertEqual(decision.extn, "mp4", "Native media export should keep MP4 extension")
      assertEqual(
        report.nativeMediaCount,
        1,
        "Media export report should count packaged inline media",
      )
      assertEqual(
        report.placeholderCount,
        1,
        "Media export report should count remote fallback media",
      )
      assert(
        !nativeOnlyPreflight.issues.some((issue) => issue.id === "media-placeholders"),
        "Inline native media should not create a placeholder preflight blocker",
      )
      assert(
        nativeOnlyPreflight.metrics.some(
          (metric) => metric.id === "native-media" && metric.value === "1",
        ),
        "Preflight metrics should count native packaged media",
      )
      assert(
        handoffNotes.includes("Remote media needs a local or inline copy"),
        "Media export notes should preserve compatibility fallback reasons",
      )
      assert(
        mediaEntryNames.some((name) => name.endsWith(".mp4")),
        "PPTX package should include the inline video media part",
      )
      assert(slideRels, "PPTX export should include slide media relationships")
      assert(
        strFromU8(slideRels).includes("/media"),
        "PPTX slide relationships should reference the packaged media",
      )
    },
  },
  {
    name: "desktop media resolver packages local media handoff sources",
    async run() {
      const localVideo = {
        ...createElement("video"),
        id: "local-video",
        alt: "Local launch clip",
        src: "C:/presentations/launch.mp4",
      } satisfies PresentationElement
      const browserAudio = {
        ...createElement("audio"),
        id: "browser-audio",
        alt: "Browser narration",
        src: "blob:https://essence.local/narration.mp3",
      } satisfies PresentationElement
      const slide = {
        ...createSlide(1),
        elements: [localVideo, browserAudio],
      } satisfies Slide
      const deck = {
        ...createDefaultDeck(),
        slides: [slide],
      } satisfies Deck
      const resolverPlan = desktopMediaResolverPlan(deck)
      const options = pptxMediaExportOptionsFromResolvedDesktopMedia([
        {
          dataUrl: "data:video/mp4;base64,AAAA",
          elementId: "local-video",
        },
        {
          dataUrl: "data:audio/mpeg;base64,AAAA",
          elementId: "browser-audio",
        },
      ])
      const unresolvedDecision = pptxMediaExportDecision(localVideo)
      const resolvedDecision = pptxMediaExportDecision(localVideo, options)
      const resolvedReport = deckPptxMediaExportReport(deck, options)
      const resolvedPreflight = pptxExportPreflight(deck, options)
      const blob = await exportDeckToPptxBlob(deck, options)
      const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()))
      const mediaEntryNames = Object.keys(entries).filter((name) =>
        name.startsWith("ppt/media/"),
      )

      assertEqual(
        resolverPlan.needsResolverCount,
        2,
        "Desktop media resolver should identify local and browser media handoffs",
      )
      assertEqual(
        unresolvedDecision.mode,
        "placeholder",
        "Local file media should remain a placeholder before resolver handoff",
      )
      assertEqual(
        resolvedDecision.mode,
        "native",
        "Resolved local media should become native PPTX media",
      )
      assertEqual(
        resolvedDecision.sourceKind,
        "local-reference",
        "Resolved export decisions should retain the original source kind",
      )
      assertEqual(
        resolvedReport.resolvedMediaCount,
        2,
        "Media export report should count desktop-resolved media",
      )
      assertEqual(
        resolvedReport.placeholderCount,
        0,
        "Resolved local media should not need placeholder fallbacks",
      )
      assert(
        !resolvedPreflight.issues.some((issue) => issue.id === "media-placeholders"),
        "Resolved local media should clear media placeholder preflight blockers",
      )
      assert(
        resolvedPreflight.metrics.some(
          (metric) => metric.id === "resolved-media" && metric.value === "2",
        ),
        "Preflight metrics should count desktop-resolved media",
      )
      assert(
        mediaEntryNames.some((name) => name.endsWith(".mp4")),
        "Resolved local video should be packaged as a PPTX media part",
      )
      assert(
        mediaEntryNames.some((name) => name.endsWith(".mp3")),
        "Resolved browser audio should be packaged as a PPTX media part",
      )
    },
  },
  {
    name: "pptx import rehydrates embedded media as playback elements",
    async run() {
      const nativeVideo = {
        ...createElement("video"),
        id: "importable-video",
        alt: "Launch clip",
        src: "data:video/mp4;base64,AAAA",
      } satisfies PresentationElement
      const nativeAudio = {
        ...createElement("audio"),
        id: "importable-audio",
        alt: "Narration",
        src: "data:audio/mpeg;base64,AAAA",
      } satisfies PresentationElement
      const deck = {
        ...createDefaultDeck(),
        slides: [
          {
            ...createSlide(1),
            elements: [nativeVideo, nativeAudio],
          },
        ],
      } satisfies Deck
      const blob = await exportDeckToPptxBlob(deck)
      const result = await importPptxDeckWithReport(
        new File([blob], "native-media.pptx", {
          type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        }),
      )
      const mediaElements = result.deck.slides[0]?.elements.filter(
        (element) => element.type === "video" || element.type === "audio",
      )

      assert(
        mediaElements?.some(
          (element) =>
            element.type === "video" &&
            element.src.startsWith("data:video/mp4;base64,"),
        ),
        "PPTX import should preserve embedded MP4 video as an editable media element",
      )
      assert(
        mediaElements?.some(
          (element) =>
            element.type === "audio" &&
            element.src.startsWith("data:audio/mpeg;base64,"),
        ),
        "PPTX import should preserve embedded MP3 audio as an editable media element",
      )
      assert(
        !result.warnings.some((warning) => warning.id === "media-skipped"),
        "Supported embedded PPTX media should not be reported as skipped",
      )
    },
  },
  {
    name: "presenter readiness reports rehearsal notes and handoff blockers",
    run() {
      const baseDeck = createDefaultDeck()
      const [firstSlide, secondSlide] = baseDeck.slides
      assert(firstSlide && secondSlide, "Default deck should include two slides")

      const deck: Deck = {
        ...baseDeck,
        slides: [
          {
            ...firstSlide,
            autoAdvanceAfterMs: 20_000,
            rehearsalDurationMs: 65_000,
            notes: "Open with the decision.",
            elements: [
              {
                ...createElement("video"),
                id: "video",
                mediaCaption: "",
              },
            ],
          },
          {
            ...secondSlide,
            rehearsalDurationMs: 0,
            notes: "",
            elements: [
              {
                ...createElement("shape"),
                id: "animated-shape",
                animation: "fade",
              },
            ],
          },
        ],
      }
      const blockedReport = presenterReadinessReport(deck, {
        audienceChannelAvailable: true,
        audienceDisplayState: "blocked",
        blankMode: "black",
        captionsVisible: false,
        fullscreenAvailable: true,
      })

      assertEqual(
        blockedReport.status,
        "attention",
        "Blocked audience display and blank screen should need action",
      )
      assert(
        blockedReport.checks.some(
          (check) => check.id === "audience-display" && check.state === "attention",
        ),
        "Presenter readiness should flag blocked audience display",
      )
      assert(
        blockedReport.checks.some(
          (check) => check.id === "screen-handoff" && check.state === "attention",
        ),
        "Presenter readiness should flag active blank screen",
      )
      assertEqual(
        blockedReport.metrics.find((metric) => metric.id === "rehearsed")?.value,
        "1/2",
        "Presenter readiness should summarize saved rehearsal coverage",
      )
      assertEqual(
        blockedReport.metrics.find((metric) => metric.id === "sequence")?.value,
        "1",
        "Presenter readiness should summarize click-sequenced slides",
      )
      assertEqual(
        blockedReport.timing.totalRehearsedLabel,
        "1:05",
        "Presenter readiness should summarize total saved rehearsal time",
      )
      assertEqual(
        blockedReport.timing.longestSlide?.slideNumber,
        1,
        "Presenter readiness should identify the longest rehearsed slide",
      )
      assert(
        blockedReport.slideReviews[0]?.issues.some(
          (issue) => issue.kind === "timing-mismatch",
        ),
        "Presenter readiness should flag auto-advance timing mismatch",
      )
      assertEqual(
        blockedReport.slideReviews[0]?.autoAdvanceDurationMs,
        20_000,
        "Presenter readiness should expose auto-advance timing for actions",
      )
      assertEqual(
        blockedReport.slideReviews[0]?.canApplyRehearsedTiming,
        true,
        "Presenter readiness should mark rehearsed slides as timing-action ready",
      )
      assertEqual(
        blockedReport.slideReviews[0]?.hasTimingMismatch,
        true,
        "Presenter readiness should expose timing mismatch state for UI actions",
      )
      assertEqual(
        blockedReport.slideReviews[0]?.needsRehearsedTimingApply,
        true,
        "Presenter readiness should mark slides whose auto timing can be synced",
      )
      assert(
        blockedReport.slideReviews[0]?.issues.some(
          (issue) => issue.kind === "short-notes",
        ),
        "Presenter readiness should flag short speaker notes",
      )
      assert(
        blockedReport.slideReviews[1]?.issues.some(
          (issue) => issue.kind === "missing-rehearsal",
        ),
        "Presenter readiness should review slides missing rehearsal timing",
      )
      assert(
        blockedReport.slideReviews[1]?.issues.some(
          (issue) => issue.kind === "missing-notes",
        ),
        "Presenter readiness should review slides missing speaker notes",
      )
      assert(
        blockedReport.cleanupActions.some(
          (action) =>
            action.id === "sync-rehearsed-timings" &&
            action.action === "apply-rehearsed-timing" &&
            action.slideNumbers.includes(1),
        ),
        "Presenter readiness should turn timing mismatches into cleanup actions",
      )
      assert(
        blockedReport.cleanupActions.some(
          (action) =>
            action.id === "rehearse-missing-slides" &&
            action.slideNumbers.includes(2),
        ),
        "Presenter readiness should turn missing rehearsal into cleanup actions",
      )
      assert(
        blockedReport.cleanupActions.some(
          (action) =>
            action.id === "polish-speaker-notes" &&
            action.slideNumbers.includes(1) &&
            action.slideNumbers.includes(2),
        ),
        "Presenter readiness should group note issues into a cleanup action",
      )
      assert(
        blockedReport.cleanupActions.some(
          (action) =>
            action.id === "add-media-captions" &&
            action.slideNumbers.includes(1),
        ),
        "Presenter readiness should turn media caption gaps into cleanup actions",
      )
      assert(
        blockedReport.cleanupActions.some(
          (action) =>
            action.id === "open-audience-display" &&
            action.state === "attention",
        ),
        "Presenter readiness should expose audience-display cleanup work",
      )
      assert(
        blockedReport.cleanupActions.some(
          (action) =>
            action.id === "fix-screen-handoff" && action.state === "attention",
        ),
        "Presenter readiness should expose screen handoff cleanup work",
      )

      const readyReport = presenterReadinessReport(
        {
          ...deck,
          slides: deck.slides.map((slide) => ({
            ...slide,
            autoAdvanceAfterMs: slide.rehearsalDurationMs || 30_000,
            notes: "Presenter note with clear delivery cue and transition.",
            rehearsalDurationMs: slide.rehearsalDurationMs || 30_000,
            elements: slide.elements.map((element) =>
              element.type === "video"
                ? { ...element, mediaCaption: "Caption" }
                : element,
            ),
          })),
        },
        {
          audienceChannelAvailable: true,
          audienceDisplayState: "connected",
          blankMode: "none",
          captionsVisible: true,
          fullscreenAvailable: true,
        },
      )

      assertEqual(
        readyReport.status,
        "ready",
        "Fully prepared presenter setup should be ready",
      )
      assertEqual(
        readyReport.cleanupActions.length,
        0,
        "Fully prepared presenter setup should not show cleanup actions",
      )
    },
  },
  {
    name: "odp import preflight records partial editable conversion scope",
    run() {
      const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:anim="urn:oasis:names:tc:opendocument:xmlns:animation:1.0"
  xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0"
  xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
>
  <office:body>
    <office:presentation>
      <draw:page draw:name="Slide 1" presentation:transition-type="fade" presentation:transition-speed="slow" presentation:duration="PT6S">
        <presentation:notes><text:p>Speaker cue</text:p></presentation:notes>
        <draw:image xlink:href="Pictures/photo.png" xmlns:xlink="http://www.w3.org/1999/xlink" />
        <draw:frame><draw:plugin xlink:href="Media/movie.mp4" xmlns:xlink="http://www.w3.org/1999/xlink" /></draw:frame>
        <draw:frame><draw:object xlink:href="./Object 1" xmlns:xlink="http://www.w3.org/1999/xlink" /></draw:frame>
        <table:table>
          <table:table-row><table:table-cell><text:p>Region</text:p></table:table-cell></table:table-row>
        </table:table>
        <draw:object />
        <anim:animate />
      </draw:page>
      <draw:page draw:name="Slide 2" />
    </office:presentation>
  </office:body>
</office:document-content>`
      const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0">
  <manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.presentation" />
  <manifest:file-entry manifest:full-path="Pictures/photo.png" manifest:media-type="image/png" />
  <manifest:file-entry manifest:full-path="Media/movie.mp4" manifest:media-type="video/mp4" />
</manifest:manifest>`
      const chartContentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0"
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
>
  <office:body>
    <office:chart>
      <chart:chart chart:class="chart:bar">
        <chart:title><text:p>Revenue</text:p></chart:title>
        <table:table>
          <table:table-row>
            <table:table-cell><text:p>Region</text:p></table:table-cell>
            <table:table-cell><text:p>Revenue</text:p></table:table-cell>
            <table:table-cell><text:p>Margin</text:p></table:table-cell>
          </table:table-row>
          <table:table-row>
            <table:table-cell><text:p>North</text:p></table:table-cell>
            <table:table-cell><text:p>42</text:p></table:table-cell>
            <table:table-cell><text:p>14</text:p></table:table-cell>
          </table:table-row>
        </table:table>
      </chart:chart>
    </office:chart>
  </office:body>
</office:document-content>`
      const report = odpImportPreflightFromEntries({
        entries: {
          "META-INF/manifest.xml": utf8(manifestXml),
          "Object 1/content.xml": utf8(chartContentXml),
          "Pictures/photo.png": utf8("image"),
          "content.xml": utf8(contentXml),
          mimetype: utf8("application/vnd.oasis.opendocument.presentation"),
        },
        importedAt: new Date("2026-05-15T00:00:00.000Z"),
        sourceFileName: "quarterly-review.odp",
      })
      const issueIds = report.issues.map((issue) => issue.id)

      assertEqual(report.status, "warning", "ODP intake should report partial editable import scope")
      assertEqual(
        report.metrics.find((metric) => metric.id === "slides")?.value,
        "2",
        "ODP preflight should count draw:page slides",
      )
      assertEqual(
        report.metrics.find((metric) => metric.id === "images")?.value,
        "1",
        "ODP preflight should count package images",
      )
      assertEqual(
        report.metrics.find((metric) => metric.id === "tables")?.value,
        "1",
        "ODP preflight should count editable table objects",
      )
      assertEqual(
        report.metrics.find((metric) => metric.id === "media")?.value,
        "1",
        "ODP preflight should count embedded media once",
      )
      assertEqual(
        report.metrics.find((metric) => metric.id === "transitions")?.value,
        "1",
        "ODP preflight should count transition metadata",
      )
      assertEqual(
        report.metrics.find((metric) => metric.id === "charts")?.value,
        "1",
        "ODP preflight should count chart objects",
      )
      assert(
        report.metrics
          .find((metric) => metric.id === "charts")
          ?.detail.includes("1 local-table, 1 multi-series, 0 linked-data"),
        "ODP preflight should summarize local and multi-series chart data",
      )
      assert(issueIds.includes("partial-editable-import"), "ODP report should explain partial conversion scope")
      assert(
        report.issues
          .find((issue) => issue.id === "partial-editable-import")
          ?.detail.includes("common charts"),
        "ODP partial import scope should mention common chart import",
      )
      assert(issueIds.includes("media"), "ODP media should be reported")
      assert(
        report.issues
          .find((issue) => issue.id === "media")
          ?.detail.includes("imports as editable playback"),
        "ODP media issue should explain supported embedded media import",
      )
      assert(issueIds.includes("embedded-objects"), "ODP embedded objects should be reported")
      assert(issueIds.includes("charts"), "ODP charts should be reported")
      assert(
        report.issues
          .find((issue) => issue.id === "charts")
          ?.detail.includes("import as editable Essence charts"),
        "ODP chart issue should explain editable chart import",
      )
      assert(issueIds.includes("animations"), "ODP animations should be reported")
      assert(issueIds.includes("transitions"), "ODP transitions should be reported")
      assert(
        report.issues
          .find((issue) => issue.id === "transitions")
          ?.detail.includes("imports into Essence slide transitions"),
        "ODP transition issue should explain common transition metadata import",
      )
      assert(issueIds.includes("speaker-notes"), "ODP notes should be reported")
      assert(
        parseOdpImportPreflightReport(report)?.sourceFileName ===
          "quarterly-review.odp",
        "ODP report should round-trip through parser",
      )
    },
  },
  {
    name: "odp import creates editable slides from title body and notes",
    run() {
      const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
  xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:xlink="http://www.w3.org/1999/xlink"
>
  <office:automatic-styles>
    <style:style style:name="shape-blue" style:family="graphic">
      <style:graphic-properties draw:fill-color="#bfdbfe" svg:stroke-color="#1d4ed8" svg:stroke-width="0.04in" />
    </style:style>
    <style:style style:name="line-dash" style:family="graphic">
      <style:graphic-properties draw:stroke="dash" svg:stroke-color="#dc2626" svg:stroke-width="0.02in" />
    </style:style>
    <style:style style:name="cell-highlight" style:family="table-cell">
      <style:table-cell-properties fo:background-color="#dcfce7" fo:border="0.02in solid #16a34a" />
      <style:text-properties fo:color="#14532d" fo:font-weight="bold" />
    </style:style>
  </office:automatic-styles>
  <office:body>
    <office:presentation>
      <draw:page draw:name="Cover" presentation:transition-type="fade" presentation:transition-speed="slow" presentation:duration="PT6S">
        <draw:frame>
          <draw:text-box>
            <text:h>Quarterly Review</text:h>
            <text:p>Growth improved in every region.</text:p>
            <text:p>Next action is partner expansion.</text:p>
          </draw:text-box>
        </draw:frame>
        <draw:frame svg:x="1in" svg:y="2in" svg:width="3in" svg:height="1.5in">
          <draw:image xlink:href="Pictures/photo.png" />
        </draw:frame>
        <draw:frame svg:x="6in" svg:y="3.2in" svg:width="2.5in" svg:height="1.2in">
          <draw:plugin xlink:href="Media/clip.mp4" />
        </draw:frame>
        <draw:rect draw:style-name="shape-blue" svg:x="5in" svg:y="1in" svg:width="2in" svg:height="1in" />
        <draw:line draw:style-name="line-dash" svg:x1="1in" svg:y1="4.5in" svg:x2="4in" svg:y2="4.5in" />
        <draw:frame svg:x="5.5in" svg:y="2in" svg:width="3in" svg:height="1in">
          <draw:object xlink:href="./Object 1" />
        </draw:frame>
        <draw:frame svg:x="1in" svg:y="3.2in" svg:width="4in" svg:height="1in">
          <table:table>
            <table:table-row>
              <table:table-cell table:number-columns-spanned="2"><text:p>Pipeline</text:p></table:table-cell>
              <table:covered-table-cell />
            </table:table-row>
            <table:table-row>
              <table:table-cell table:style-name="cell-highlight"><text:p>North</text:p></table:table-cell>
              <table:table-cell><text:p>$42K</text:p></table:table-cell>
            </table:table-row>
          </table:table>
        </draw:frame>
        <presentation:notes>
          <text:p>Open with the customer story.</text:p>
        </presentation:notes>
      </draw:page>
      <draw:page draw:name="Second">
        <draw:frame>
          <draw:text-box>
            <text:p>Operating Plan</text:p>
            <text:p>Hiring and onboarding remain the bottleneck.</text:p>
          </draw:text-box>
        </draw:frame>
      </draw:page>
    </office:presentation>
  </office:body>
</office:document-content>`
      const chartContentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0"
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
>
  <office:body>
    <office:chart>
      <chart:chart chart:class="chart:line">
        <chart:title><text:p>Revenue trend</text:p></chart:title>
        <chart:legend />
        <table:table>
          <table:table-row>
            <table:table-cell><text:p>Quarter</text:p></table:table-cell>
            <table:table-cell><text:p>Revenue</text:p></table:table-cell>
            <table:table-cell><text:p>Margin</text:p></table:table-cell>
          </table:table-row>
          <table:table-row>
            <table:table-cell><text:p>Q1</text:p></table:table-cell>
            <table:table-cell><text:p>42</text:p></table:table-cell>
            <table:table-cell><text:p>12</text:p></table:table-cell>
          </table:table-row>
          <table:table-row>
            <table:table-cell><text:p>Q2</text:p></table:table-cell>
            <table:table-cell><text:p>64</text:p></table:table-cell>
            <table:table-cell><text:p>18</text:p></table:table-cell>
          </table:table-row>
        </table:table>
      </chart:chart>
    </office:chart>
  </office:body>
</office:document-content>`
      const result = importOdpDeckFromEntries({
        entries: {
          "Media/clip.mp4": new Uint8Array([4, 5, 6]),
          "Object 1/content.xml": utf8(chartContentXml),
          "Pictures/photo.png": new Uint8Array([1, 2, 3]),
          "content.xml": utf8(contentXml),
          mimetype: utf8("application/vnd.oasis.opendocument.presentation"),
        },
        importedAt: new Date("2026-05-15T00:00:00.000Z"),
        sourceFileName: "quarterly-review.odp",
      })
      const [firstSlide, secondSlide] = result.deck.slides
      const importedRectangle = firstSlide?.elements.find(
        (element) => element.type === "shape" && element.shapeKind === "rectangle",
      )
      const importedLine = firstSlide?.elements.find(
        (element) => element.type === "shape" && element.shapeKind === "line",
      )
      const importedTable = firstSlide?.elements.find(
        (element) => element.type === "table",
      )
      const importedVideo = firstSlide?.elements.find(
        (element) => element.type === "video",
      )
      const importedChart = firstSlide?.elements.find(
        (element) => element.type === "chart",
      )

      assert(firstSlide && secondSlide, "ODP import should create two slides")
      assertEqual(result.deck.title, "quarterly review", "ODP deck title should come from the file name")
      assertEqual(firstSlide.title, "Quarterly Review", "First heading should become the slide title")
      assertEqual(firstSlide.layout, "title-body", "Slide with body text should use a title-body layout")
      assertEqual(
        firstSlide.transition,
        "fade",
        "ODP fade transition metadata should import as an Essence fade transition",
      )
      assertEqual(
        firstSlide.transitionDurationMs,
        1000,
        "ODP slow transition speed should map to a longer transition duration",
      )
      assertEqual(
        firstSlide.autoAdvanceAfterMs,
        6000,
        "ODP page duration should import as auto-advance timing",
      )
      assertEqual(
        firstSlide.elements.find((element) => element.type === "title")?.content,
        "Quarterly Review",
        "Heading should become an editable title object",
      )
      assert(
        firstSlide.elements.some(
          (element) =>
            element.type === "text" &&
            element.content.includes("Growth improved") &&
            element.content.includes("partner expansion") &&
            !element.content.includes("Pipeline"),
        ),
        "Body paragraphs should become editable body text without duplicated table cells",
      )
      assertEqual(
        firstSlide.notes,
        "Open with the customer story.",
        "Speaker notes should be preserved",
      )
      assertEqual(
        result.deck.assets.length,
        1,
        "ODP image entries should become deck assets",
      )
      assert(
        firstSlide.elements.some(
          (element) =>
            element.type === "image" &&
            element.assetId === result.deck.assets[0]?.id &&
            element.x === 10 &&
            element.y > 35 &&
            element.width === 30,
        ),
        "ODP draw:image frames should become positioned editable image objects",
      )
      assert(
        importedRectangle,
        "ODP draw:rect should become an editable rectangle shape",
      )
      assertEqual(
        importedRectangle?.background,
        "#bfdbfe",
        "ODP graphic fill color should be preserved on basic shapes",
      )
      assertEqual(
        importedRectangle?.shapeStrokeColor,
        "#1d4ed8",
        "ODP graphic stroke color should be preserved on basic shapes",
      )
      assertEqual(
        importedRectangle?.x,
        50,
        "ODP shape x geometry should map into slide percentages",
      )
      assert(
        importedLine,
        "ODP draw:line should become an editable line shape",
      )
      assertEqual(
        importedLine?.shapeStrokeDash,
        "dash",
        "ODP dashed strokes should map to Essence line dash styles",
      )
      assertEqual(
        importedLine?.shapeConnectorStartX,
        0,
        "ODP line start geometry should preserve direction",
      )
      assertEqual(
        importedLine?.shapeConnectorEndX,
        100,
        "ODP line end geometry should preserve direction",
      )
      assert(importedTable, "ODP table:table should become an editable table")
      assertEqual(
        importedTable?.tableRows,
        2,
        "ODP table rows should be preserved",
      )
      assertEqual(
        importedTable?.tableColumns,
        2,
        "ODP table columns should be preserved",
      )
      assertArrayEqual(
        importedTable?.tableCells ?? [],
        ["Pipeline", "", "North", "$42K"],
        "ODP table cell text should be preserved in row order",
      )
      assertEqual(
        importedTable?.tableCellMerges[0]?.columnSpan,
        2,
        "ODP spanned table cells should become merge metadata",
      )
      assertEqual(
        importedTable?.x,
        10,
        "ODP table frame x geometry should map into slide percentages",
      )
      assertEqual(
        importedTable?.tableCellStyles[0]?.background,
        "#dcfce7",
        "ODP table-cell background styles should be preserved",
      )
      assertEqual(
        importedTable?.tableCellStyles[0]?.borderColor,
        "#16a34a",
        "ODP table-cell border styles should be preserved",
      )
      assertEqual(
        importedTable?.tableCellStyles[0]?.color,
        "#14532d",
        "ODP table-cell text color should be preserved",
      )
      assertEqual(
        importedTable?.tableCellStyles[0]?.fontWeight,
        700,
        "ODP bold table-cell text should be preserved",
      )
      assert(importedVideo, "ODP draw:plugin video should become editable media")
      assert(
        importedVideo?.src.startsWith("data:video/mp4;base64,"),
        "ODP embedded video bytes should become an inline data URL",
      )
      assertEqual(
        importedVideo?.alt,
        "clip.mp4",
        "ODP media filename should become the media label",
      )
      assertEqual(
        mediaSourceKind(importedVideo as PresentationElement),
        "inline",
        "ODP embedded media should be treated as an inline source after import",
      )
      assertEqual(
        importedVideo?.x,
        60,
        "ODP media frame x geometry should map into slide percentages",
      )
      assert(importedChart, "ODP draw:object chart should become editable chart")
      assertEqual(
        importedChart?.content,
        "Revenue trend",
        "ODP chart title should be preserved",
      )
      assertEqual(
        importedChart?.chartType,
        "line",
        "ODP chart class should map to an Essence chart type",
      )
      assertEqual(
        importedChart?.chartData[2]?.label,
        "Q2 - Revenue",
        "ODP multi-series chart labels should combine category and series names",
      )
      assertEqual(
        importedChart?.chartData[2]?.value,
        64,
        "ODP multi-series chart values should come from the local chart table",
      )
      assertEqual(
        importedChart?.chartData[3]?.label,
        "Q2 - Margin",
        "ODP multi-series chart labels should preserve later series names",
      )
      assertEqual(
        importedChart?.chartData[3]?.value,
        18,
        "ODP multi-series chart values should preserve later series values",
      )
      assertEqual(
        importedChart?.chartSeries[0]?.name,
        "Revenue",
        "ODP chart series should preserve the first local-table series name",
      )
      assertEqual(
        importedChart?.chartSeries[1]?.data[1]?.value,
        18,
        "ODP chart series should preserve category-aligned multi-series values",
      )
      assertEqual(
        Math.round(importedChart?.x ?? 0),
        55,
        "ODP chart frame x geometry should map into slide percentages",
      )
      assertEqual(secondSlide.title, "Operating Plan", "First paragraph should title slides without headings")
      assert(
        result.report.issues.some((issue) => issue.id === "partial-editable-import"),
        "ODP import should keep the compatibility report with the imported deck",
      )
    },
  },
  {
    name: "slide SVG export escapes titles and text content",
    run() {
      const slide = slideWithElements([
        {
          ...createElement("text"),
          id: "text-1",
          content: "1 < 2 & 3 > 2",
          x: 10,
          y: 10,
          width: 50,
          height: 10,
        },
      ])
      const svg = serializeSlideToSvg({
        ...slide,
        title: "Risk & <Plan>",
        background: "#ffffff",
      })

      assert(
        svg.includes('aria-label="Risk &amp; &lt;Plan&gt;"'),
        "Slide SVG should escape the aria title",
      )
      assert(
        svg.includes("1 &lt; 2 &amp; 3 &gt; 2"),
        "Slide SVG should escape text content",
      )
    },
  },
  {
    name: "print handout export includes escaped notes and open comments",
    run() {
      const deck = createDefaultDeck()
      const [firstSlide, ...restSlides] = deck.slides

      assert(firstSlide, "Default deck should include a first slide")

      const html = serializeDeckToPrintHtml(
        {
          ...deck,
          title: "Review <Deck>",
          slides: [
            {
              ...firstSlide,
              notes: "Speaker <note>",
              comments: [
                {
                  id: "comment-1",
                  body: "Check <risk>",
                  authorName: "Ava & Team",
                  targetElementId: "",
                  mentions: ["dev"],
                  resolved: false,
                  createdAt: "",
                  updatedAt: "",
                },
                {
                  id: "comment-2",
                  body: "Resolved comment",
                  authorName: "Ava",
                  targetElementId: "",
                  mentions: [],
                  resolved: true,
                  createdAt: "",
                  updatedAt: "",
                },
              ],
            },
            ...restSlides,
          ],
        },
        {
          layout: "notes",
          orientation: "landscape",
          includeNotes: true,
          includeComments: true,
          includeSlideNumbers: true,
          includeDate: false,
        },
      )

      assert(html.includes("Review &lt;Deck&gt;"), "Print HTML should escape deck title")
      assert(html.includes("Speaker &lt;note&gt;"), "Print HTML should include escaped notes")
      assert(html.includes("Check &lt;risk&gt;"), "Print HTML should include open comments")
      assert(html.includes("@dev"), "Print HTML should include comment mentions")
      assert(!html.includes("Resolved comment"), "Print HTML should exclude resolved comments")
    },
  },
]

let failures = 0

for (const regressionCase of regressionCases) {
  try {
    await regressionCase.run()
    console.log(`PASS ${regressionCase.name}`)
  } catch (error) {
    failures += 1
    const message = error instanceof Error ? error.message : String(error)

    console.error(`FAIL ${regressionCase.name}: ${message}`)
  }
}

if (failures) {
  console.error(`${failures} presentation regression check(s) failed.`)
  process.exitCode = 1
} else {
  console.log(`${regressionCases.length} presentation regression checks passed.`)
}
