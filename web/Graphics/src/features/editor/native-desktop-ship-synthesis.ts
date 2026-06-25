import type {
  CommandAutomationRecordingReport,
} from "@/features/editor/command-automation-recording";
import type {
  LargeCanvasRenderSchedulerReport,
} from "@/features/editor/large-canvas-render-scheduler";
import type {
  MediaAssetPipelineReviewReport,
} from "@/features/editor/media-asset-pipeline-review";
import type { ProductionReadinessSynthesisPacket } from "@/features/editor/production-readiness-synthesis";
import type { TauriDesktopPackagingReadinessReport } from "@/features/editor/tauri-desktop-packaging-readiness";
import type {
  NativeDesktopReleasePacket,
  NativeDesktopShipDecision,
  NativeDesktopShipSynthesisInput,
  NativeDesktopShipSynthesisReport,
  NativeDesktopShipSynthesisRow,
  NativeDesktopShipSynthesisStatus,
} from "@/features/editor/native-desktop-ship-synthesis-types";

export {
  getNativeDesktopShipSynthesisCsv,
  getNativeDesktopShipSynthesisJson,
  getNativeDesktopShipSynthesisMarkdown,
} from "@/features/editor/native-desktop-ship-synthesis-export";
export type {
  NativeDesktopReleasePacket,
  NativeDesktopReleasePacketKind,
  NativeDesktopShipDecision,
  NativeDesktopShipSynthesisCategory,
  NativeDesktopShipSynthesisInput,
  NativeDesktopShipSynthesisReport,
  NativeDesktopShipSynthesisRow,
  NativeDesktopShipSynthesisStatus,
} from "@/features/editor/native-desktop-ship-synthesis-types";

export function getNativeDesktopShipSynthesisReport({
  commandAutomation,
  generatedAt = new Date().toISOString(),
  largeCanvasScheduler,
  mediaAssetPipeline,
  productionReadiness,
  tauriDesktopPackaging,
}: NativeDesktopShipSynthesisInput): NativeDesktopShipSynthesisReport {
  const sourceRows = [
    getTauriRuntimeRow(tauriDesktopPackaging),
    getCanvasSchedulerRow(largeCanvasScheduler),
    getMediaPipelineRow(mediaAssetPipeline),
    getCommandAutomationRow(commandAutomation),
    getProductionEvidenceRow(productionReadiness),
  ];
  const releasePackets = [
    getTauriPacket(tauriDesktopPackaging),
    getCanvasPacket(largeCanvasScheduler),
    getMediaPacket(mediaAssetPipeline),
    getCommandPacket(commandAutomation),
    getProductionPacket(productionReadiness),
  ];
  const blockerCount = sourceRows.reduce(
    (total, row) => total + row.blockerCount,
    0,
  );
  const reviewItemCount = sourceRows.reduce(
    (total, row) => total + row.reviewCount,
    0,
  );
  const status = getAggregateStatus(sourceRows);
  const desktopShipDecision = getShipDecision(status);
  const score = Math.min(...sourceRows.map((row) => row.sourceScore));
  const shipGatePacket = getShipGatePacket({
    blockerCount,
    desktopShipDecision,
    reviewItemCount,
    sourceCount: sourceRows.length,
    status,
  });
  const finalReleasePackets = [...releasePackets, shipGatePacket];
  const shipGateRow = getShipGateRow({
    blockerCount,
    desktopShipDecision,
    releasePackets: finalReleasePackets,
    reviewItemCount,
    score,
    sourceRows,
    status,
  });
  const rows = [...sourceRows, shipGateRow].sort(sortRows);
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const evidenceCount = finalReleasePackets.reduce(
    (total, packet) => total + packet.evidenceCount,
    0,
  );
  const minimumScoreCategory = rows.reduce((minimum, row) =>
    row.sourceScore < minimum.sourceScore ? row : minimum,
  ).category;

  return {
    generatedAt,
    status,
    desktopShipDecision,
    score,
    sourceCount: sourceRows.length,
    readyCount,
    reviewCount,
    blockedCount,
    blockerCount,
    reviewItemCount,
    evidenceCount,
    releasePacketCount: finalReleasePackets.length,
    desktopParityEvidenceCount: getDesktopParityEvidenceCount(finalReleasePackets),
    rollbackEvidenceCount: getEvidenceMatchCount(finalReleasePackets, /do-?not-ship|do not ship|rollback|replay/i),
    offlineEvidenceCount: getEvidenceMatchCount(finalReleasePackets, /offline|frontendDist|static export|bundle/i),
    minimumScoreCategory,
    sourceScores: {
      "canvas-scheduler": largeCanvasScheduler.score,
      "command-automation": commandAutomation.score,
      "media-pipeline": mediaAssetPipeline.score,
      "production-evidence": productionReadiness.score,
      "ship-gate": score,
      "tauri-runtime": tauriDesktopPackaging.score,
    },
    executiveSummary: getExecutiveSummary({
      blockerCount,
      desktopShipDecision,
      evidenceCount,
      releasePacketCount: finalReleasePackets.length,
      reviewItemCount,
      score,
      sourceRows,
    }),
    signoffChecklist: getSignoffChecklist(status, sourceRows),
    rows,
    releasePackets: finalReleasePackets,
  };
}

function getTauriRuntimeRow(
  report: TauriDesktopPackagingReadinessReport,
): NativeDesktopShipSynthesisRow {
  return {
    id: "native-desktop-tauri-runtime",
    status: report.status,
    category: "tauri-runtime",
    label: "Tauri runtime and desktop shell",
    detail: `${report.productName} ${report.appVersion} has Rust ${report.rustCommandStatus}, filesystem ${report.filesystemPermissionStatus}, offline bundle ${report.offlineBundleStatus}, updater ${report.updaterStatus}, and release packet ${report.releasePacketStatus}.`,
    sourceScore: report.score,
    blockerCount: report.blockedCount,
    reviewCount: report.reviewCount,
    evidenceCount:
      report.releasePacketEvidenceCount +
      report.commandHandlerCount +
      report.iconCount,
    releasePacketIds: ["tauri-desktop-runtime-release-packet"],
    recommendation:
      report.status === "ready"
        ? "Attach Tauri readiness exports, installer manifest, and updater evidence to the desktop release."
        : "Clear Tauri runtime, offline bundle, filesystem permission, and updater blockers before packaging.",
  };
}

function getCanvasSchedulerRow(
  report: LargeCanvasRenderSchedulerReport,
): NativeDesktopShipSynthesisRow {
  return {
    id: "native-desktop-canvas-scheduler",
    status: report.status,
    category: "canvas-scheduler",
    label: "Large-canvas scheduler and interaction budget",
    detail: `${report.pageName} has ${report.scheduledTileCount} scheduled tiles, ${report.hotTileCount} hot tiles, ${report.selectionCacheInvalidationCount} selection invalidations, ${report.simplificationCandidateCount} vector simplification candidates, and ${report.profilerEvidenceCount} profiler evidence rows.`,
    sourceScore: report.score,
    blockerCount: report.blockedCount,
    reviewCount: report.reviewCount,
    evidenceCount:
      report.scheduledTileCount +
      report.profilerEvidenceCount +
      report.simplificationCandidateCount,
    releasePacketIds: ["large-canvas-scheduler-release-packet"],
    recommendation:
      report.status === "ready"
        ? "Keep scheduler queues and profiler evidence with native desktop performance signoff."
        : "Resolve hot tiles, selection cache invalidation, and vector simplification queues before desktop release.",
  };
}

function getMediaPipelineRow(
  report: MediaAssetPipelineReviewReport,
): NativeDesktopShipSynthesisRow {
  return {
    id: "native-desktop-media-pipeline",
    status: report.status,
    category: "media-pipeline",
    label: "Media upload, replacement, and export pipeline",
    detail: `${report.assetCount} assets include ${report.imageAssetCount} images, ${report.videoAssetCount} videos, ${report.exportManifestEntryCount} manifest entries, ${report.compressionCandidateCount} compression targets, and ${report.replacementTrackedCount} replacement records.`,
    sourceScore: report.score,
    blockerCount: report.blockedCount,
    reviewCount: report.reviewCount,
    evidenceCount:
      report.exportManifestEntryCount +
      report.replacementTrackedCount +
      report.compressionCandidateCount,
    releasePacketIds: ["media-asset-pipeline-release-packet"],
    recommendation:
      report.status === "ready"
        ? "Attach media manifest, provenance, and compression packet to desktop release evidence."
        : "Repair source metadata, upload provenance, compression, and manifest blockers before packaging.",
  };
}

function getCommandAutomationRow(
  report: CommandAutomationRecordingReport,
): NativeDesktopShipSynthesisRow {
  return {
    id: "native-desktop-command-automation",
    status: report.status,
    category: "command-automation",
    label: "Command automation and replay QA",
    detail: `${report.recordedCommandEventCount} recorded events produced ${report.macroCandidateCount} macros, ${report.safeMacroCount} safe macros, ${report.replayQaPacketCount} QA packets, ${report.telemetryExportCount} telemetry exports, and ${report.replayArtifactCount} replay artifacts.`,
    sourceScore: report.score,
    blockerCount: report.blockedCount + report.blockedMacroCount,
    reviewCount: report.reviewCount + report.slowCommandCount,
    evidenceCount:
      report.replayQaPacketCount +
      report.telemetryExportCount +
      report.replayArtifactCount,
    releasePacketIds: ["command-automation-release-packet"],
    recommendation:
      report.status === "ready"
        ? "Attach macro safety checks, undo previews, QA packets, and telemetry exports."
        : "Clear unsafe macros, failed commands, missing telemetry, and unscoped undo previews before desktop release.",
  };
}

function getProductionEvidenceRow(
  report: ProductionReadinessSynthesisPacket,
): NativeDesktopShipSynthesisRow {
  return {
    id: "native-desktop-production-evidence",
    status: normalizeProductionStatus(report.status),
    category: "production-evidence",
    label: "Production readiness and release evidence",
    detail: `${report.sectionCount} production sections roll up to ${report.shipDecision} with ${report.blockerCount} blockers, ${report.reviewItemCount} review items, ${report.evidenceCount} evidence artifacts, and minimum area ${report.minimumScoreArea}.`,
    sourceScore: report.score,
    blockerCount: report.blockerCount,
    reviewCount: report.reviewItemCount,
    evidenceCount: report.evidenceCount,
    releasePacketIds: ["production-readiness-release-packet"],
    recommendation:
      report.status === "ready"
        ? "Bundle production readiness synthesis with final desktop release notes."
        : "Resolve production blockers or review items before approving the native desktop release.",
  };
}

function getShipGateRow({
  blockerCount,
  desktopShipDecision,
  releasePackets,
  reviewItemCount,
  score,
  sourceRows,
  status,
}: {
  blockerCount: number;
  desktopShipDecision: NativeDesktopShipDecision;
  releasePackets: NativeDesktopReleasePacket[];
  reviewItemCount: number;
  score: number;
  sourceRows: NativeDesktopShipSynthesisRow[];
  status: NativeDesktopShipSynthesisStatus;
}): NativeDesktopShipSynthesisRow {
  return {
    id: "native-desktop-ship-gate",
    status,
    category: "ship-gate",
    label: "Native desktop release gate",
    detail: `${sourceRows.length} source systems roll up to ${desktopShipDecision} with ${blockerCount} blockers, ${reviewItemCount} review items, and ${releasePackets.length} release packets.`,
    sourceScore: score,
    blockerCount,
    reviewCount: reviewItemCount,
    evidenceCount: releasePackets.reduce(
      (total, packet) => total + packet.evidenceCount,
      0,
    ),
    releasePacketIds: releasePackets.map((packet) => packet.id),
    recommendation:
      status === "ready"
        ? "Ship with native desktop synthesis JSON, CSV, Markdown, and source packets attached."
        : status === "blocked"
          ? "Do not ship until every blocked source system is cleared and re-exported."
          : "Route review items to the desktop release owner before final approval.",
  };
}

function getTauriPacket(
  report: TauriDesktopPackagingReadinessReport,
): NativeDesktopReleasePacket {
  return {
    id: "tauri-desktop-runtime-release-packet",
    kind: "offline",
    category: "tauri-runtime",
    status: report.status,
    label: "Tauri desktop runtime packet",
    detail: `${report.productName} ${report.appVersion} runtime, updater, permissions, offline bundle, and installer evidence.`,
    source: "Tauri desktop packaging readiness",
    evidence: [
      `Offline bundle status: ${report.offlineBundleStatus}.`,
      `Rust command status: ${report.rustCommandStatus}.`,
      `Filesystem permission status: ${report.filesystemPermissionStatus}.`,
      `Updater status: ${report.updaterStatus}.`,
      ...report.releasePacketEvidence,
    ],
    evidenceCount: 4 + report.releasePacketEvidenceCount,
  };
}

function getCanvasPacket(
  report: LargeCanvasRenderSchedulerReport,
): NativeDesktopReleasePacket {
  return {
    id: "large-canvas-scheduler-release-packet",
    kind: "desktop-parity",
    category: "canvas-scheduler",
    status: report.status,
    label: "Canvas scheduler performance packet",
    detail: `${report.scheduledTileCount} draw queues, ${report.hotTileCount} hot queues, and ${report.profilerEvidenceCount} profiler evidence rows.`,
    source: "Large-canvas render scheduler",
    evidence: [
      `Viewport tiled draw queue count: ${report.scheduledTileCount}.`,
      `Selection cache invalidation count: ${report.selectionCacheInvalidationCount}.`,
      `Vector simplification candidates: ${report.simplificationCandidateCount}.`,
      ...report.profilerEvidence.map((item) => `${item.label}: ${item.detail}`),
    ],
    evidenceCount: 3 + report.profilerEvidenceCount,
  };
}

function getMediaPacket(
  report: MediaAssetPipelineReviewReport,
): NativeDesktopReleasePacket {
  return {
    id: "media-asset-pipeline-release-packet",
    kind: "asset-bundle",
    category: "media-pipeline",
    status: report.status,
    label: "Media asset bundle packet",
    detail: `${report.exportManifestEntryCount} manifest entries, ${report.compressionCandidateCount} compression targets, and ${report.replacementTrackedCount} replacements.`,
    source: "Media asset pipeline review",
    evidence: [
      `Export manifest entries: ${report.exportManifestEntryCount}.`,
      `Image/video coverage: ${report.imageAssetCount} images and ${report.videoAssetCount} videos.`,
      `Compression target bytes: ${report.compressionTargetBytes}.`,
      ...report.bundleManifest.slice(0, 6).map(
        (item) => `${item.fileName}: ${item.mimeType}, ${item.hash}.`,
      ),
    ],
    evidenceCount: 3 + report.bundleManifest.length,
  };
}

function getCommandPacket(
  report: CommandAutomationRecordingReport,
): NativeDesktopReleasePacket {
  return {
    id: "command-automation-release-packet",
    kind: "qa-replay",
    category: "command-automation",
    status: report.status,
    label: "Command automation QA replay packet",
    detail: `${report.macroCandidateCount} macros, ${report.replayQaPacketCount} QA packets, ${report.telemetryExportCount} telemetry exports, and ${report.replayArtifactCount} replay artifacts.`,
    source: "Command automation recording",
    evidence: [
      `Safe macros: ${report.safeMacroCount}.`,
      `Blocked macros: ${report.blockedMacroCount}.`,
      `Replay artifacts: ${report.replayArtifactCount}.`,
      ...report.qaPackets
        .slice(0, 6)
        .map((packet) => `${packet.label}: ${packet.exportFileName}.`),
    ],
    evidenceCount: 3 + report.qaPackets.length + report.telemetryExportCount,
  };
}

function getProductionPacket(
  report: ProductionReadinessSynthesisPacket,
): NativeDesktopReleasePacket {
  return {
    id: "production-readiness-release-packet",
    kind: "rollback",
    category: "production-evidence",
    status: normalizeProductionStatus(report.status),
    label: "Production readiness packet",
    detail: `${report.shipDecision} decision, ${report.evidenceCount} evidence artifacts, and ${report.minimumScoreArea} minimum score area.`,
    source: "Production readiness synthesis",
    evidence: [
      `Production ship decision: ${report.shipDecision}.`,
      `Minimum score area: ${report.minimumScoreArea}.`,
      ...report.releaseEvidenceBundle,
    ],
    evidenceCount: 2 + report.releaseEvidenceBundle.length,
  };
}

function getShipGatePacket({
  blockerCount,
  desktopShipDecision,
  reviewItemCount,
  sourceCount,
  status,
}: {
  blockerCount: number;
  desktopShipDecision: NativeDesktopShipDecision;
  reviewItemCount: number;
  sourceCount: number;
  status: NativeDesktopShipSynthesisStatus;
}): NativeDesktopReleasePacket {
  return {
    id: "native-desktop-ship-gate-release-packet",
    kind: "release-packet",
    category: "ship-gate",
    status,
    label: "Native desktop ship gate packet",
    detail: `${sourceCount} sources produce ${desktopShipDecision} with ${blockerCount} blockers and ${reviewItemCount} review items.`,
    source: "Native desktop ship synthesis",
    evidence: [
      `Desktop ship decision: ${desktopShipDecision}.`,
      `Blockers: ${blockerCount}.`,
      `Review items: ${reviewItemCount}.`,
      desktopShipDecision === "do-not-ship"
        ? "Do-not-ship decision must keep rollback and retry evidence attached."
        : "Attach desktop release notes, source packets, and rollback anchor.",
    ],
    evidenceCount: 4,
  };
}

function getAggregateStatus(rows: NativeDesktopShipSynthesisRow[]) {
  if (rows.some((row) => row.status === "blocked")) {
    return "blocked";
  }

  if (rows.some((row) => row.status === "review")) {
    return "review";
  }

  return "ready";
}

function getShipDecision(
  status: NativeDesktopShipSynthesisStatus,
): NativeDesktopShipDecision {
  if (status === "blocked") {
    return "do-not-ship";
  }

  if (status === "review") {
    return "review-required";
  }

  return "ship";
}

function normalizeProductionStatus(
  status: ProductionReadinessSynthesisPacket["status"],
): NativeDesktopShipSynthesisStatus {
  return status;
}

function getDesktopParityEvidenceCount(
  packets: NativeDesktopReleasePacket[],
) {
  return packets.filter((packet) =>
    ["asset-bundle", "desktop-parity", "offline", "qa-replay"].includes(
      packet.kind,
    ),
  ).length;
}

function getEvidenceMatchCount(
  packets: NativeDesktopReleasePacket[],
  pattern: RegExp,
) {
  return packets
    .flatMap((packet) => [packet.detail, ...packet.evidence])
    .filter((item) => pattern.test(item)).length;
}

function getExecutiveSummary({
  blockerCount,
  desktopShipDecision,
  evidenceCount,
  releasePacketCount,
  reviewItemCount,
  score,
  sourceRows,
}: {
  blockerCount: number;
  desktopShipDecision: NativeDesktopShipDecision;
  evidenceCount: number;
  releasePacketCount: number;
  reviewItemCount: number;
  score: number;
  sourceRows: NativeDesktopShipSynthesisRow[];
}) {
  const weakest = sourceRows.reduce((minimum, row) =>
    row.sourceScore < minimum.sourceScore ? row : minimum,
  );

  return [
    `Native desktop release decision is ${desktopShipDecision} with a ${score} minimum source score.`,
    `${releasePacketCount} release packets carry ${evidenceCount} evidence items across Tauri, canvas, media, command automation, and production readiness.`,
    `${blockerCount} blockers and ${reviewItemCount} review items remain; weakest source is ${weakest.category}.`,
  ];
}

function getSignoffChecklist(
  status: NativeDesktopShipSynthesisStatus,
  sourceRows: NativeDesktopShipSynthesisRow[],
) {
  const sourceChecks = sourceRows.map(
    (row) =>
      `Attach ${row.category} packet with score ${row.sourceScore} and ${row.evidenceCount} evidence items.`,
  );

  return [
    "Export native desktop ship synthesis JSON.",
    "Export native desktop ship synthesis CSV.",
    "Export native desktop ship synthesis Markdown.",
    ...sourceChecks,
    status === "ready"
      ? "Confirm desktop installer, offline bundle, scheduler, media manifest, command QA, and production evidence are archived."
      : "Re-run the blocked or review source systems after remediation and regenerate this gate.",
  ];
}

function sortRows(
  left: NativeDesktopShipSynthesisRow,
  right: NativeDesktopShipSynthesisRow,
) {
  const statusOrder: Record<NativeDesktopShipSynthesisStatus, number> = {
    blocked: 0,
    review: 1,
    ready: 2,
  };

  return (
    statusOrder[left.status] - statusOrder[right.status] ||
    left.sourceScore - right.sourceScore ||
    left.label.localeCompare(right.label)
  );
}
