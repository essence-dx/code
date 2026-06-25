import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  BrandColorSummary,
  BrandFontSummary,
  BrandLogoSummary,
  ProjectDetail,
} from "@/features/editor/types";
import {
  createMediaProductionReadinessReport,
  type MediaProductionReadinessCheck,
} from "@/features/editor/media-production-readiness";
import { isMediaTimelineElement } from "@/features/editor/media-timeline";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";
import { createMediaAudioLoudnessCheck } from "@/features/media-delivery/media-brand-delivery-kit-audio";
import {
  createMediaBumperOutroPresets,
  createMediaLowerThirdPresets,
} from "@/features/media-delivery/media-brand-delivery-kit-presets";
import type {
  MediaAudioLoudnessCheck,
  MediaBrandDeliveryKit,
  MediaBrandDeliveryKitCenter,
  MediaBrandDeliveryKitCenterInput,
  MediaBrandDeliveryKitStatus,
  MediaBrandDeliveryManifestItem,
  MediaBrandDeliveryPacket,
  MediaBumperOutroPreset,
  MediaLowerThirdPreset,
  MediaTimelineQaReport,
} from "@/features/media-delivery/media-brand-delivery-kits-types";

export type {
  BumperOutroPresetKind,
  LowerThirdPresetRole,
  MediaAudioLoudnessCheck,
  MediaBrandDeliveryKit,
  MediaBrandDeliveryKitCenter,
  MediaBrandDeliveryKitCenterInput,
  MediaBrandDeliveryKitStatus,
  MediaBrandDeliveryManifestItem,
  MediaBrandDeliveryPacket,
  MediaBumperOutroPreset,
  MediaLowerThirdPreset,
  MediaTimelineQaReport,
} from "@/features/media-delivery/media-brand-delivery-kits-types";

const mediaExportFormats = new Set(["media-sequence", "mp4", "gif"]);

export function createMediaBrandDeliveryKitCenter(
  input: MediaBrandDeliveryKitCenterInput,
): MediaBrandDeliveryKitCenter {
  const generatedAt = normalizeDate(input.now).toISOString();
  const handoffByProject = new Map(
    input.projectHandoffPackets.map((packet) => [packet.projectId, packet]),
  );
  const kits = input.projects
    .filter((project) =>
      isMediaDeliveryCandidate({
        project,
        exportJobs: input.serverExportJobs.filter(
          (job) => job.projectId === project.id,
        ),
      }),
    )
    .map((project) =>
      createMediaBrandDeliveryKit({
        project,
        brandColors: input.brandColors,
        brandFonts: input.brandFonts,
        brandLogos: input.brandLogos,
        exportJobs: input.serverExportJobs.filter(
          (job) => job.projectId === project.id,
        ),
        handoffPacket: handoffByProject.get(project.id) ?? null,
        generatedAt,
      }),
    )
    .sort(compareKits)
    .slice(0, 12);
  const score = average(
    kits.map((kit) => kit.score),
    100,
  );

  return {
    status: aggregateStatus(kits.map((kit) => kit.status)),
    score,
    generatedAt,
    kits,
    nextActions: createCenterNextActions(kits),
    totals: {
      projects: kits.length,
      lowerThirdPresets: kits.reduce(
        (total, kit) => total + kit.lowerThirdPresets.length,
        0,
      ),
      bumperOutroPresets: kits.reduce(
        (total, kit) => total + kit.bumperOutroPresets.length,
        0,
      ),
      audioLoudnessChecks: kits.length,
      timelineQaReports: kits.length,
      deliveryPackets: kits.length,
      readyKits: kits.filter((kit) => kit.status === "ready").length,
      reviewKits: kits.filter((kit) => kit.status === "review").length,
      blockedKits: kits.filter((kit) => kit.status === "blocked").length,
    },
  };
}

function createMediaBrandDeliveryKit(input: {
  project: ProjectDetail;
  brandColors: BrandColorSummary[];
  brandFonts: BrandFontSummary[];
  brandLogos: BrandLogoSummary[];
  exportJobs: ServerExportJobSummary[];
  handoffPacket: ProjectHandoffPacket | null;
  generatedAt: string;
}): MediaBrandDeliveryKit {
  const elements = input.project.document.pages.flatMap(
    (page) => page.elements,
  );
  const readiness = createMediaProductionReadinessReport(elements);
  const lowerThirdPresets = createMediaLowerThirdPresets(input);
  const bumperOutroPresets = createMediaBumperOutroPresets(input);
  const audioLoudness = createMediaAudioLoudnessCheck({
    project: input.project,
    readiness,
  });
  const timelineQa = createTimelineQaReport({
    project: input.project,
    readiness,
  });
  const exportSummary = createExportSummary(input.exportJobs);
  const status = createKitStatus({
    project: input.project,
    audioLoudness,
    timelineQa,
    exportSummary,
    handoffPacket: input.handoffPacket,
  });
  const score = createKitScore({
    status,
    project: input.project,
    brandColors: input.brandColors,
    brandFonts: input.brandFonts,
    brandLogos: input.brandLogos,
    audioLoudness,
    timelineQa,
    exportSummary,
    handoffPacket: input.handoffPacket,
  });
  const nextAction = createNextAction({
    status,
    project: input.project,
    audioLoudness,
    timelineQa,
    exportSummary,
    handoffPacket: input.handoffPacket,
  });
  const deliveryPacket = createDeliveryPacket({
    status,
    project: input.project,
    generatedAt: input.generatedAt,
    lowerThirdPresets,
    bumperOutroPresets,
    audioLoudness,
    timelineQa,
    exportSummary,
    nextAction,
  });

  return {
    id: `media-brand-kit-${input.project.id}`,
    projectId: input.project.id,
    projectName: input.project.name,
    status,
    score,
    nextAction,
    lowerThirdPresets,
    bumperOutroPresets,
    audioLoudness,
    timelineQa,
    exportSummary,
    deliveryPacket,
  };
}

function createTimelineQaReport(input: {
  project: ProjectDetail;
  readiness: ReturnType<typeof createMediaProductionReadinessReport>;
}): MediaTimelineQaReport {
  return {
    id: `timeline-qa-${input.project.id}`,
    status: readinessStatusToKitStatus(input.readiness.status),
    score: input.readiness.score,
    readiness: input.readiness,
    checks: input.readiness.checks.map(createTimelineQaCheck),
  };
}

function createTimelineQaCheck(check: MediaProductionReadinessCheck) {
  return {
    id: check.id,
    label: check.label,
    status: readinessStatusToKitStatus(check.status),
    detail: check.detail,
    action: check.action,
  };
}

function createExportSummary(exportJobs: ServerExportJobSummary[]) {
  const mediaJobs = exportJobs
    .filter((job) => mediaExportFormats.has(job.format))
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() -
        new Date(left.updatedAt).getTime(),
    );
  const completed = mediaJobs.filter((job) => job.status === "completed");
  const failedCount = mediaJobs.filter((job) => job.status === "failed").length;
  const hasRunning = mediaJobs.some(
    (job) => job.status === "queued" || job.status === "running",
  );
  const latestCompleted = completed[0] ?? null;

  return {
    status: latestCompleted
      ? "ready"
      : hasRunning
        ? "running"
        : failedCount
          ? "failed"
          : "missing",
    latestArtifactName:
      latestCompleted?.artifactName ?? latestCompleted?.fileName ?? null,
    latestFormatLabel: latestCompleted?.formatLabel ?? null,
    completedCount: completed.length,
    failedCount,
  } satisfies MediaBrandDeliveryKit["exportSummary"];
}

function createKitStatus(input: {
  project: ProjectDetail;
  audioLoudness: MediaAudioLoudnessCheck;
  timelineQa: MediaTimelineQaReport;
  exportSummary: MediaBrandDeliveryKit["exportSummary"];
  handoffPacket: ProjectHandoffPacket | null;
}): MediaBrandDeliveryKitStatus {
  if (
    input.project.approvalStatus === "changes-requested" ||
    input.timelineQa.status === "blocked" ||
    input.exportSummary.status === "failed" ||
    input.handoffPacket?.status === "blocked"
  ) {
    return "blocked";
  }

  if (
    input.project.approvalStatus === "approved" &&
    input.audioLoudness.status === "ready" &&
    input.timelineQa.status === "ready" &&
    input.exportSummary.status === "ready" &&
    input.handoffPacket?.status === "ready"
  ) {
    return "ready";
  }

  return "review";
}

function createKitScore(input: {
  status: MediaBrandDeliveryKitStatus;
  project: ProjectDetail;
  brandColors: BrandColorSummary[];
  brandFonts: BrandFontSummary[];
  brandLogos: BrandLogoSummary[];
  audioLoudness: MediaAudioLoudnessCheck;
  timelineQa: MediaTimelineQaReport;
  exportSummary: MediaBrandDeliveryKit["exportSummary"];
  handoffPacket: ProjectHandoffPacket | null;
}) {
  const weighted = Math.round(
    input.timelineQa.score * 0.35 +
      exportScore(input.exportSummary.status) * 0.25 +
      brandKitScore(input) * 0.15 +
      statusScore(input.audioLoudness.status) * 0.15 +
      approvalScore(input.project, input.handoffPacket) * 0.1,
  );

  if (input.status === "ready") return Math.max(88, weighted);
  if (input.status === "blocked") return Math.min(68, weighted);

  return Math.max(45, Math.min(84, weighted));
}

function createNextAction(input: {
  status: MediaBrandDeliveryKitStatus;
  project: ProjectDetail;
  audioLoudness: MediaAudioLoudnessCheck;
  timelineQa: MediaTimelineQaReport;
  exportSummary: MediaBrandDeliveryKit["exportSummary"];
  handoffPacket: ProjectHandoffPacket | null;
}) {
  if (input.status === "ready") {
    return `${input.project.name} is ready with brand presets, loudness review, timeline QA, and media export packet.`;
  }

  if (input.project.approvalStatus === "changes-requested") {
    return `Resolve approval changes before media delivery for ${input.project.name}.`;
  }

  if (input.exportSummary.status === "failed") {
    return `Resolve failed media export before delivery for ${input.project.name}.`;
  }

  if (input.timelineQa.status !== "ready") {
    const check = input.timelineQa.checks.find(
      (item) => item.status !== "ready",
    );

    return `${check?.action ?? "Review timeline QA"} for ${input.project.name}.`;
  }

  if (input.audioLoudness.status !== "ready") {
    return `${input.audioLoudness.action} ${input.project.name}.`;
  }

  if (input.handoffPacket?.status !== "ready") {
    return `Review the project handoff packet before media delivery for ${input.project.name}.`;
  }

  return `Review media delivery kit for ${input.project.name}.`;
}

function createDeliveryPacket(input: {
  status: MediaBrandDeliveryKitStatus;
  project: ProjectDetail;
  generatedAt: string;
  lowerThirdPresets: MediaLowerThirdPreset[];
  bumperOutroPresets: MediaBumperOutroPreset[];
  audioLoudness: MediaAudioLoudnessCheck;
  timelineQa: MediaTimelineQaReport;
  exportSummary: MediaBrandDeliveryKit["exportSummary"];
  nextAction: string;
}): MediaBrandDeliveryPacket {
  const manifest = createManifest(input);
  const payload = {
    kind: "essence-studio.media-brand-delivery-kit",
    projectId: input.project.id,
    projectName: input.project.name,
    generatedAt: input.generatedAt,
    status: input.status,
    nextAction: input.nextAction,
    lowerThirdPresets: input.lowerThirdPresets.length,
    bumperOutroPresets: input.bumperOutroPresets.length,
    audioLoudness: input.audioLoudness,
    timelineQa: {
      status: input.timelineQa.status,
      score: input.timelineQa.score,
      counts: input.timelineQa.readiness.counts,
      checks: input.timelineQa.checks,
    },
    exportSummary: input.exportSummary,
    manifest,
  };

  return {
    id: `media-delivery-packet-${input.project.id}`,
    title: `${input.project.name} media brand delivery kit`,
    status: input.status,
    generatedAt: input.generatedAt,
    manifest,
    downloadJson: createJsonDataUrl(payload),
  };
}

function createManifest(input: {
  status: MediaBrandDeliveryKitStatus;
  project: ProjectDetail;
  lowerThirdPresets: MediaLowerThirdPreset[];
  bumperOutroPresets: MediaBumperOutroPreset[];
  audioLoudness: MediaAudioLoudnessCheck;
  timelineQa: MediaTimelineQaReport;
  exportSummary: MediaBrandDeliveryKit["exportSummary"];
}): MediaBrandDeliveryManifestItem[] {
  const manifest: MediaBrandDeliveryManifestItem[] = [
    {
      id: `manifest-lower-third-${input.project.id}`,
      kind: "lower-third",
      label: "Lower-thirds",
      detail: `${input.lowerThirdPresets.length} reusable lower-third presets included.`,
    },
    {
      id: `manifest-bumper-${input.project.id}`,
      kind: "bumper",
      label: "Bumper",
      detail:
        input.bumperOutroPresets.find((preset) => preset.kind === "bumper")
          ?.copy ?? "Brand bumper preset included.",
    },
    {
      id: `manifest-outro-${input.project.id}`,
      kind: "outro",
      label: "Outro",
      detail:
        input.bumperOutroPresets.find((preset) => preset.kind === "outro")
          ?.copy ?? "Outro preset included.",
    },
    {
      id: `manifest-loudness-${input.project.id}`,
      kind: "loudness",
      label: "Audio loudness",
      detail: input.audioLoudness.detail,
    },
    {
      id: `manifest-timeline-${input.project.id}`,
      kind: "timeline",
      label: "Timeline QA",
      detail: `${input.timelineQa.score}/100 with ${input.timelineQa.readiness.counts.clips} clips.`,
    },
    {
      id: `manifest-metadata-${input.project.id}`,
      kind: "metadata",
      label: "Media metadata",
      detail: `${input.project.width} x ${input.project.height}px source project.`,
    },
  ];

  if (input.exportSummary.latestArtifactName) {
    manifest.push({
      id: `manifest-artifact-${input.project.id}`,
      kind: "artifact",
      label: "Media export artifact",
      detail: input.exportSummary.latestArtifactName,
    });
  }

  if (input.status === "blocked") {
    manifest.push({
      id: `manifest-blocker-${input.project.id}`,
      kind: "blocker",
      label: "Delivery blockers",
      detail: createBlockerDetail(input),
    });
  }

  return manifest;
}

function createBlockerDetail(input: {
  timelineQa: MediaTimelineQaReport;
  exportSummary: MediaBrandDeliveryKit["exportSummary"];
  audioLoudness: MediaAudioLoudnessCheck;
}) {
  const blockers = [
    input.timelineQa.status === "blocked" ? "timeline QA" : null,
    input.exportSummary.status === "failed" ? "failed export" : null,
    input.audioLoudness.status !== "ready" ? "loudness review" : null,
  ].filter((blocker): blocker is string => Boolean(blocker));

  return blockers.length ? blockers.join(", ") : "Approval or handoff blocker.";
}

function isMediaDeliveryCandidate(input: {
  project: ProjectDetail;
  exportJobs: ServerExportJobSummary[];
}) {
  const hasMediaElements = input.project.document.pages
    .flatMap((page) => page.elements)
    .some(isMediaTimelineElement);
  const hasMediaExport = input.exportJobs.some((job) =>
    mediaExportFormats.has(job.format),
  );

  return (
    hasMediaElements ||
    hasMediaExport ||
    /(video|reel|motion|bumper|outro|short|media)/i.test(input.project.name)
  );
}

function readinessStatusToKitStatus(
  status: MediaBrandDeliveryKitStatus,
): MediaBrandDeliveryKitStatus {
  return status;
}

function brandKitScore(input: {
  brandColors: BrandColorSummary[];
  brandFonts: BrandFontSummary[];
  brandLogos: BrandLogoSummary[];
}) {
  return (
    (input.brandColors.length ? 35 : 0) +
    (input.brandFonts.length ? 35 : 0) +
    (input.brandLogos.length ? 30 : 0)
  );
}

function exportScore(status: MediaBrandDeliveryKit["exportSummary"]["status"]) {
  if (status === "ready") return 100;
  if (status === "running") return 70;
  if (status === "failed") return 25;

  return 45;
}

function approvalScore(
  project: ProjectDetail,
  handoffPacket: ProjectHandoffPacket | null,
) {
  const projectScore =
    project.approvalStatus === "approved"
      ? 60
      : project.approvalStatus === "in-review"
        ? 42
        : project.approvalStatus === "draft"
          ? 30
          : 10;
  const handoffScore =
    handoffPacket?.status === "ready"
      ? 40
      : handoffPacket?.status === "review"
        ? 28
        : handoffPacket?.status === "blocked"
          ? 8
          : 20;

  return projectScore + handoffScore;
}

function statusScore(status: MediaBrandDeliveryKitStatus) {
  if (status === "ready") return 100;
  if (status === "review") return 68;

  return 25;
}

function aggregateStatus(
  statuses: MediaBrandDeliveryKitStatus[],
): MediaBrandDeliveryKitStatus {
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("review")) return "review";

  return "ready";
}

function average(values: number[], fallback: number) {
  if (!values.length) return fallback;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function compareKits(
  left: MediaBrandDeliveryKit,
  right: MediaBrandDeliveryKit,
) {
  const statusDelta = statusRank(left.status) - statusRank(right.status);
  if (statusDelta !== 0) return statusDelta;

  return right.score - left.score;
}

function statusRank(status: MediaBrandDeliveryKitStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

function normalizeDate(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function createCenterNextActions(kits: MediaBrandDeliveryKit[]) {
  const actions = kits
    .filter((kit) => kit.status !== "ready")
    .map((kit) => kit.nextAction);

  if (actions.length) return actions.slice(0, 4);

  return kits.length
    ? ["All media brand delivery kits are export-ready."]
    : [
        "Add video or audio to a project and export a media sequence to create the first delivery kit.",
      ];
}

function createJsonDataUrl(payload: unknown) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(payload, null, 2),
  )}`;
}
