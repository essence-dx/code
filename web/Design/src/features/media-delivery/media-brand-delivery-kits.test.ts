import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  BrandColorSummary,
  BrandFontSummary,
  BrandLogoSummary,
  ProjectDetail,
  ProjectSummary,
} from "@/features/editor/types";
import {
  createAudioElement,
  createPage,
  createVideoElement,
} from "@/features/editor/document-factory";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";
import { createMediaBrandDeliveryKitCenter } from "@/features/media-delivery/media-brand-delivery-kits";

describe("media brand delivery kits", () => {
  test("creates lower-thirds, bumper/outro presets, loudness checks, timeline QA, and export packets", () => {
    const center = createMediaBrandDeliveryKitCenter({
      projects: [
        createProject({
          id: "project-reel",
          name: "Founder launch reel",
          approvalStatus: "approved",
          elements: [
            createVideoElement({
              src: "data:video/mp4;base64,AAAA",
              mimeType: "video/mp4",
              transitionIn: "fade",
              transitionOut: "fade",
              subtitleCues: [
                {
                  id: "caption-1",
                  startSeconds: 0,
                  endSeconds: 3,
                  text: "A better way to launch.",
                },
              ],
            }),
            createAudioElement({
              src: "data:audio/mpeg;base64,AAAA",
              mimeType: "audio/mpeg",
              volume: 0.65,
              volumeKeyframes: [
                { timeSeconds: 0, volume: 0.65 },
                { timeSeconds: 1, volume: 0.35 },
                { timeSeconds: 8, volume: 0.35 },
                { timeSeconds: 10, volume: 0.65 },
              ],
              licenseName: "CC0",
              sourceProvider: "Essence library",
            }),
          ],
        }),
        createProject({
          id: "project-rough",
          name: "Teaser rough cut",
          approvalStatus: "changes-requested",
          elements: [
            createVideoElement({
              src: "data:video/mp4;base64,BBBB",
              mimeType: "video/mp4",
            }),
            createAudioElement({
              src: "data:audio/mpeg;base64,BBBB",
              mimeType: "audio/mpeg",
              volume: 1,
            }),
          ],
        }),
      ],
      brandColors: [
        createBrandColor({ id: "brand-ink", color: "#111827" }),
        createBrandColor({ id: "brand-accent", color: "#14b8a6" }),
      ],
      brandFonts: [
        createBrandFont({
          id: "font-heading",
          role: "heading",
          fontFamily: "Satoshi",
          fontSize: 44,
          fontWeight: 800,
        }),
        createBrandFont({
          id: "font-caption",
          role: "caption",
          fontFamily: "Inter",
          fontSize: 18,
          fontWeight: 600,
        }),
      ],
      brandLogos: [createBrandLogo()],
      serverExportJobs: [
        createExportJob({
          id: "export-reel",
          projectId: "project-reel",
          projectName: "Founder launch reel",
          status: "completed",
          format: "media-sequence",
          formatLabel: "Media sequence",
          artifactName: "founder-launch-reel.media.json",
          artifactDataUrl: "data:application/json;base64,AAAA",
          completedAt: "2026-05-19T12:20:00.000Z",
        }),
        createExportJob({
          id: "export-rough",
          projectId: "project-rough",
          projectName: "Teaser rough cut",
          status: "failed",
          format: "mp4",
          formatLabel: "MP4",
          failureMessage: "Timeline captions missing.",
        }),
      ],
      projectHandoffPackets: [
        createHandoffPacket({
          projectId: "project-reel",
          projectName: "Founder launch reel",
          status: "ready",
          approvalStatus: "approved",
        }),
        createHandoffPacket({
          projectId: "project-rough",
          projectName: "Teaser rough cut",
          status: "blocked",
          approvalStatus: "changes-requested",
        }),
      ],
      now: "2026-05-19T12:30:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.projects, 2);
    assert.equal(center.totals.lowerThirdPresets, 6);
    assert.equal(center.totals.bumperOutroPresets, 4);
    assert.equal(center.totals.audioLoudnessChecks, 2);
    assert.equal(center.totals.timelineQaReports, 2);
    assert.equal(center.totals.deliveryPackets, 2);
    assert.equal(center.totals.readyKits, 1);
    assert.equal(center.totals.blockedKits, 1);

    const reel = center.kits.find((kit) => kit.projectId === "project-reel");
    assert.equal(reel?.status, "ready");
    assert.equal(reel?.lowerThirdPresets[0].fontFamily, "Satoshi");
    assert.equal(reel?.lowerThirdPresets[0].accentColor, "#14b8a6");
    assert.ok(
      reel?.bumperOutroPresets.some((preset) => preset.kind === "bumper"),
      "includes a branded bumper preset",
    );
    assert.ok(
      reel?.bumperOutroPresets.some((preset) => preset.kind === "outro"),
      "includes a branded outro preset",
    );
    assert.equal(reel?.audioLoudness.targetLufs, -16);
    assert.equal(reel?.audioLoudness.status, "ready");
    assert.equal(reel?.timelineQa.status, "ready");
    assert.ok(
      reel?.deliveryPacket.manifest.some((item) => item.kind === "artifact"),
      "links the completed media export",
    );

    const packet = decodePacket(reel?.deliveryPacket.downloadJson ?? "");
    assert.equal(packet.kind, "essence-studio.media-brand-delivery-kit");
    assert.equal(packet.projectId, "project-reel");
    assert.equal(packet.lowerThirdPresets, 3);
    assert.equal(packet.bumperOutroPresets, 2);

    const rough = center.kits.find((kit) => kit.projectId === "project-rough");
    assert.equal(rough?.status, "blocked");
    assert.equal(rough?.audioLoudness.status, "review");
    assert.equal(rough?.timelineQa.status, "review");
    assert.ok(rough?.nextAction.includes("Resolve"));
    assert.ok(
      rough?.deliveryPacket.manifest.some((item) => item.kind === "blocker"),
      "blocked media packets include blockers",
    );
  });
});

function decodePacket(dataUrl: string) {
  const [, payload = ""] = dataUrl.split(",");

  return JSON.parse(decodeURIComponent(payload)) as {
    kind: string;
    projectId: string;
    lowerThirdPresets: number;
    bumperOutroPresets: number;
  };
}

function createProject(
  overrides: Partial<ProjectSummary> &
    Pick<ProjectSummary, "id" | "name"> & {
      elements: ProjectDetail["document"]["pages"][number]["elements"];
    },
): ProjectDetail {
  const page = createPage({
    name: "Scene 1",
    format: "video",
    width: 1920,
    height: 1080,
    elements: overrides.elements,
  });

  return {
    id: overrides.id,
    name: overrides.name,
    width: 1920,
    height: 1080,
    folderId: null,
    sourceProjectId: null,
    variantProfileId: null,
    variantName: null,
    thumbnail: "data:image/png;base64,thumb",
    publicShareId: null,
    editShareId: "edit-share",
    editSharePermission: "comment",
    approvalStatus: overrides.approvalStatus ?? "in-review",
    starred: false,
    deletedAt: null,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-05-19T10:00:00.000Z",
    document: {
      version: 1,
      width: 1920,
      height: 1080,
      activePageId: page.id,
      pages: [page],
    },
  };
}

function createBrandColor(input: {
  id: string;
  color: string;
}): BrandColorSummary {
  return {
    id: input.id,
    color: input.color,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T08:00:00.000Z",
  };
}

function createBrandFont(
  overrides: Partial<BrandFontSummary> & Pick<BrandFontSummary, "id" | "role">,
): BrandFontSummary {
  return {
    id: overrides.id,
    role: overrides.role,
    fontFamily: overrides.fontFamily ?? "Inter",
    fontSize: overrides.fontSize ?? 24,
    fontWeight: overrides.fontWeight ?? 700,
    letterSpacing: overrides.letterSpacing ?? 0,
    lineHeight: overrides.lineHeight ?? 1.1,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T08:00:00.000Z",
  };
}

function createBrandLogo(): BrandLogoSummary {
  return {
    id: "logo-1",
    name: "Essence mark",
    mimeType: "image/png",
    dataUrl: "data:image/png;base64,logo",
    sizeBytes: 2048,
    width: 512,
    height: 512,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T08:00:00.000Z",
  };
}

function createExportJob(
  overrides: Partial<ServerExportJobSummary> &
    Pick<ServerExportJobSummary, "id" | "projectId" | "projectName">,
): ServerExportJobSummary {
  return {
    id: overrides.id,
    projectId: overrides.projectId,
    projectName: overrides.projectName,
    format: overrides.format ?? "media-sequence",
    formatLabel: overrides.formatLabel ?? "Media sequence",
    fileName: overrides.fileName ?? `${overrides.projectId}.media.json`,
    status: overrides.status ?? "completed",
    progress: overrides.progress ?? 100,
    artifactName: overrides.artifactName ?? null,
    artifactMimeType: overrides.artifactMimeType ?? "application/json",
    artifactSizeBytes: overrides.artifactSizeBytes ?? 90_000,
    artifactDataUrl: overrides.artifactDataUrl ?? null,
    failureMessage: overrides.failureMessage ?? null,
    createdAt: overrides.createdAt ?? "2026-05-19T12:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-05-19T12:20:00.000Z",
    completedAt: overrides.completedAt ?? null,
  };
}

function createHandoffPacket(input: {
  projectId: string;
  projectName: string;
  status: ProjectHandoffPacket["status"];
  approvalStatus: ProjectSummary["approvalStatus"];
}): ProjectHandoffPacket {
  return {
    projectId: input.projectId,
    projectName: input.projectName,
    updatedAt: "2026-05-19T10:00:00.000Z",
    approvalStatus: input.approvalStatus,
    packetScore: input.status === "ready" ? 94 : 42,
    status: input.status,
    nextAction:
      input.status === "ready"
        ? "Ready for delivery."
        : "Resolve project handoff blockers.",
    readinessReport: null,
    exportBundle: {
      status: input.status === "ready" ? "ready" : "failed",
      completedCount: input.status === "ready" ? 1 : 0,
      storedArtifactCount: input.status === "ready" ? 1 : 0,
      failedCount: input.status === "ready" ? 0 : 1,
      latestFormatLabel: input.status === "ready" ? "Media sequence" : null,
      latestArtifactName:
        input.status === "ready" ? `${input.projectId}.media.json` : null,
      latestCompletedAt:
        input.status === "ready" ? "2026-05-19T12:20:00.000Z" : null,
      totalStoredBytes: input.status === "ready" ? 90_000 : 0,
    },
    stakeholderNotes: {
      totalCount: input.status === "ready" ? 1 : 2,
      unresolvedCount: input.status === "ready" ? 0 : 1,
      openTaskCount: input.status === "ready" ? 0 : 1,
      overdueTaskCount: 0,
      latestNoteAt: "2026-05-19T09:00:00.000Z",
    },
    approvalHistory: [],
    checklist: [],
  };
}
