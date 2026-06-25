import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { ProjectSummary } from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";
import {
  classifyVendorProductFamily,
  createVendorCutPath,
  createVendorFinishingNotes,
  getVendorProductFamilyCode,
  getVendorRequiredProofViews,
  getVendorTrimSize,
  vendorBleedInches,
  vendorSafeMarginInches,
} from "@/features/print-production/vendor-production-handoff-rules";
import type {
  VendorProductFamily,
  VendorProductionDeliveryPacket,
  VendorProductionDielineSpec,
  VendorProductionFinishingNote,
  VendorProductionHandoff,
  VendorProductionHandoffCenter,
  VendorProductionHandoffCenterInput,
  VendorProductionHandoffStatus,
  VendorProductionManifestItem,
  VendorProductionProofSheet,
  VendorProductionSkuMetadata,
} from "@/features/print-production/vendor-production-handoff-types";

export type {
  VendorProductFamily,
  VendorProductionDeliveryPacket,
  VendorProductionDielineSpec,
  VendorProductionFinishingNote,
  VendorProductionHandoff,
  VendorProductionHandoffCenter,
  VendorProductionHandoffCenterInput,
  VendorProductionHandoffStatus,
  VendorProductionManifestItem,
  VendorProductionProofSheet,
  VendorProductionSkuMetadata,
} from "@/features/print-production/vendor-production-handoff-types";

const printExportFormats = new Set([
  "print-pdf",
  "pdf",
  "multipage-pdf",
  "png",
  "svg",
]);

export function createVendorProductionHandoffCenter(
  input: VendorProductionHandoffCenterInput,
): VendorProductionHandoffCenter {
  const generatedAt = normalizeDate(input.now).toISOString();
  const auditByProject = new Map(
    input.projectAudits.map((audit) => [audit.projectId, audit]),
  );
  const handoffPacketByProject = new Map(
    input.projectHandoffPackets.map((packet) => [packet.projectId, packet]),
  );
  const handoffs = input.projects
    .filter((project) => !project.deletedAt)
    .map((project) =>
      createVendorProductionHandoff({
        project,
        audit: auditByProject.get(project.id) ?? null,
        exportJobs: input.serverExportJobs.filter(
          (job) => job.projectId === project.id,
        ),
        projectHandoffPacket: handoffPacketByProject.get(project.id) ?? null,
        generatedAt,
      }),
    )
    .sort(compareVendorHandoffs)
    .slice(0, 12);
  const score = average(
    handoffs.map((handoff) => handoff.score),
    100,
  );
  const statuses = handoffs.map((handoff) => handoff.status);

  return {
    status: aggregateStatus(statuses),
    score,
    generatedAt,
    handoffs,
    nextActions: createCenterNextActions(handoffs),
    totals: {
      projects: handoffs.length,
      dielineSpecs: handoffs.length,
      proofSheets: handoffs.length,
      finishingNotes: handoffs.reduce(
        (total, handoff) => total + handoff.finishingNotes.length,
        0,
      ),
      skuPackages: handoffs.length,
      deliveryPackets: handoffs.length,
      readyHandoffs: handoffs.filter((handoff) => handoff.status === "ready")
        .length,
      reviewHandoffs: handoffs.filter((handoff) => handoff.status === "review")
        .length,
      blockedHandoffs: handoffs.filter(
        (handoff) => handoff.status === "blocked",
      ).length,
    },
  };
}

function createVendorProductionHandoff(input: {
  project: ProjectSummary;
  audit: ProjectAuditSummary | null;
  exportJobs: ServerExportJobSummary[];
  projectHandoffPacket: ProjectHandoffPacket | null;
  generatedAt: string;
}): VendorProductionHandoff {
  const printAudit = getPrintAuditDimension(input.audit);
  const latestExport = getLatestPrintExport(input.exportJobs);
  const productFamily = classifyVendorProductFamily(input.project);
  const dieline = createDielineSpec({
    project: input.project,
    productFamily,
  });
  const proofSheet = createProofSheet({
    project: input.project,
    productFamily,
    printAudit,
    latestExport,
  });
  const finishingNotes = createVendorFinishingNotes(productFamily);
  const skuMetadata = createSkuMetadata({
    project: input.project,
    productFamily,
    generatedAt: input.generatedAt,
  });
  const status = createHandoffStatus({
    project: input.project,
    printAudit,
    latestExport,
    projectHandoffPacket: input.projectHandoffPacket,
    proofSheet,
  });
  const score = createHandoffScore({
    status,
    project: input.project,
    printAudit,
    latestExport,
    projectHandoffPacket: input.projectHandoffPacket,
    proofSheet,
  });
  const nextAction = createNextAction({
    status,
    project: input.project,
    printAudit,
    latestExport,
    projectHandoffPacket: input.projectHandoffPacket,
    proofSheet,
  });
  const deliveryPacket = createDeliveryPacket({
    status,
    project: input.project,
    generatedAt: input.generatedAt,
    dieline,
    proofSheet,
    finishingNotes,
    skuMetadata,
    latestExport,
    nextAction,
  });

  return {
    id: `vendor-handoff-${input.project.id}`,
    projectId: input.project.id,
    projectName: input.project.name,
    status,
    score,
    nextAction,
    dieline,
    proofSheet,
    finishingNotes,
    skuMetadata,
    deliveryPacket,
  };
}

function createDielineSpec(input: {
  project: ProjectSummary;
  productFamily: VendorProductFamily;
}): VendorProductionDielineSpec {
  const trim = getVendorTrimSize(input.project, input.productFamily);
  const resolutionDpi = Math.round(
    Math.min(
      input.project.width / Math.max(0.1, trim.width),
      input.project.height / Math.max(0.1, trim.height),
    ),
  );
  const panelCount =
    input.productFamily === "package-flat"
      ? 5
      : input.productFamily === "card"
        ? 2
        : 1;

  return {
    id: `dieline-${input.project.id}`,
    productFamily: input.productFamily,
    trimWidthInches: trim.width,
    trimHeightInches: trim.height,
    bleedInches: vendorBleedInches,
    safeMarginInches: vendorSafeMarginInches,
    resolutionDpi,
    colorProfile: resolutionDpi >= 250 ? "CMYK target" : "RGB proof",
    panelCount,
    cutPath: createVendorCutPath(input.productFamily),
    detail: `${formatInches(trim.width)} x ${formatInches(trim.height)} trim with ${formatInches(vendorBleedInches)} bleed and ${panelCount} vendor panel${panelCount === 1 ? "" : "s"}.`,
  };
}

function createProofSheet(input: {
  project: ProjectSummary;
  productFamily: VendorProductFamily;
  printAudit: ProjectAuditSummary["dimensions"][number] | null;
  latestExport: ServerExportJobSummary | null;
}): VendorProductionProofSheet {
  const missingItems = createMissingProofItems(input);
  const status = createProofSheetStatus({
    printAudit: input.printAudit,
    latestExport: input.latestExport,
    missingItems,
  });
  const exportArtifactName =
    input.latestExport?.artifactName ?? input.latestExport?.fileName ?? null;

  return {
    id: `proof-sheet-${input.project.id}`,
    status,
    thumbnail: input.project.thumbnail,
    requiredViews: getVendorRequiredProofViews(input.productFamily),
    printAuditScore: input.printAudit?.score ?? null,
    exportArtifactName,
    missingItems,
    detail:
      status === "ready"
        ? `${input.project.name} has artwork preview, print audit evidence, and export artifact ${exportArtifactName}.`
        : `${input.project.name} needs ${missingItems.join(", ")} before the proof sheet is vendor-ready.`,
  };
}

function createSkuMetadata(input: {
  project: ProjectSummary;
  productFamily: VendorProductFamily;
  generatedAt: string;
}): VendorProductionSkuMetadata {
  const slug = slugify(input.project.name);
  const dimensions = `${input.project.width}x${input.project.height}`;
  const revision = input.generatedAt.slice(0, 10).replaceAll("-", "");
  const sku =
    `ESS-${slug}-${dimensions}-${input.project.id.slice(0, 6)}`.toUpperCase();

  return {
    sku,
    packageCode: `${getVendorProductFamilyCode(input.productFamily)}-${revision}`,
    revision,
    dimensionsLabel: `${input.project.width} x ${input.project.height}px`,
    vendorFileName: `${slug || "project"}-${dimensions}-${revision}`,
  };
}

function createDeliveryPacket(input: {
  status: VendorProductionHandoffStatus;
  project: ProjectSummary;
  generatedAt: string;
  dieline: VendorProductionDielineSpec;
  proofSheet: VendorProductionProofSheet;
  finishingNotes: VendorProductionFinishingNote[];
  skuMetadata: VendorProductionSkuMetadata;
  latestExport: ServerExportJobSummary | null;
  nextAction: string;
}): VendorProductionDeliveryPacket {
  const manifest = createManifest(input);
  const payload = {
    kind: "essence-studio.vendor-production-handoff",
    projectId: input.project.id,
    projectName: input.project.name,
    generatedAt: input.generatedAt,
    status: input.status,
    nextAction: input.nextAction,
    dieline: input.dieline,
    proofSheet: input.proofSheet,
    finishingNotes: input.finishingNotes,
    skuMetadata: input.skuMetadata,
    manifest,
  };

  return {
    id: `vendor-packet-${input.project.id}`,
    title: `${input.project.name} vendor production packet`,
    status: input.status,
    generatedAt: input.generatedAt,
    manifest,
    downloadJson: createJsonDataUrl(payload),
  };
}

function createManifest(input: {
  status: VendorProductionHandoffStatus;
  project: ProjectSummary;
  dieline: VendorProductionDielineSpec;
  proofSheet: VendorProductionProofSheet;
  finishingNotes: VendorProductionFinishingNote[];
  skuMetadata: VendorProductionSkuMetadata;
  latestExport: ServerExportJobSummary | null;
}): VendorProductionManifestItem[] {
  const artifactName =
    input.latestExport?.artifactName ?? input.latestExport?.fileName ?? null;
  const items: VendorProductionManifestItem[] = [
    {
      id: `manifest-dieline-${input.project.id}`,
      kind: "dieline",
      label: "Dieline spec",
      detail: input.dieline.detail,
    },
    {
      id: `manifest-proof-${input.project.id}`,
      kind: "proof",
      label: "Proof sheet",
      detail: input.proofSheet.detail,
    },
    {
      id: `manifest-metadata-${input.project.id}`,
      kind: "metadata",
      label: "SKU metadata",
      detail: `${input.skuMetadata.sku} packaged as ${input.skuMetadata.packageCode}.`,
    },
    {
      id: `manifest-finishing-${input.project.id}`,
      kind: "finishing",
      label: "Finishing notes",
      detail: `${input.finishingNotes.length} stock, coating, color, and cut notes included.`,
    },
  ];

  if (artifactName) {
    items.push({
      id: `manifest-artifact-${input.project.id}`,
      kind: "artifact",
      label: "Print artifact",
      detail: artifactName,
    });
  }

  if (input.status === "blocked") {
    items.push({
      id: `manifest-blocker-${input.project.id}`,
      kind: "blocker",
      label: "Vendor blockers",
      detail: input.proofSheet.missingItems.join(", ") || "Blocked status.",
    });
  }

  return items;
}

function createHandoffStatus(input: {
  project: ProjectSummary;
  printAudit: ProjectAuditSummary["dimensions"][number] | null;
  latestExport: ServerExportJobSummary | null;
  projectHandoffPacket: ProjectHandoffPacket | null;
  proofSheet: VendorProductionProofSheet;
}): VendorProductionHandoffStatus {
  if (
    input.project.approvalStatus === "changes-requested" ||
    input.printAudit?.status === "fix" ||
    input.projectHandoffPacket?.status === "blocked" ||
    input.proofSheet.status === "blocked"
  ) {
    return "blocked";
  }

  if (
    input.project.approvalStatus === "approved" &&
    input.printAudit?.status === "ready" &&
    input.latestExport?.status === "completed" &&
    input.projectHandoffPacket?.status === "ready" &&
    input.project.thumbnail
  ) {
    return "ready";
  }

  return "review";
}

function createProofSheetStatus(input: {
  printAudit: ProjectAuditSummary["dimensions"][number] | null;
  latestExport: ServerExportJobSummary | null;
  missingItems: string[];
}): VendorProductionHandoffStatus {
  if (
    input.printAudit?.status === "fix" ||
    (input.latestExport?.status === "failed" && !input.latestExport.completedAt)
  ) {
    return "blocked";
  }

  return input.missingItems.length ? "review" : "ready";
}

function createHandoffScore(input: {
  status: VendorProductionHandoffStatus;
  project: ProjectSummary;
  printAudit: ProjectAuditSummary["dimensions"][number] | null;
  latestExport: ServerExportJobSummary | null;
  projectHandoffPacket: ProjectHandoffPacket | null;
  proofSheet: VendorProductionProofSheet;
}) {
  const printScore = input.printAudit?.score ?? 55;
  const exportScore = getExportScore(input.latestExport);
  const proofScore = input.proofSheet.thumbnail ? 100 : 45;
  const approvalScore = getApprovalScore(input.project.approvalStatus);
  const handoffScore =
    input.projectHandoffPacket?.status === "ready"
      ? 100
      : input.projectHandoffPacket?.status === "review"
        ? 70
        : input.projectHandoffPacket?.status === "blocked"
          ? 25
          : 50;
  const weighted = Math.round(
    printScore * 0.3 +
      exportScore * 0.25 +
      proofScore * 0.15 +
      approvalScore * 0.15 +
      handoffScore * 0.15,
  );

  if (input.status === "ready") return Math.max(88, weighted);
  if (input.status === "blocked") return Math.min(68, weighted);

  return Math.max(45, Math.min(84, weighted));
}

function createNextAction(input: {
  status: VendorProductionHandoffStatus;
  project: ProjectSummary;
  printAudit: ProjectAuditSummary["dimensions"][number] | null;
  latestExport: ServerExportJobSummary | null;
  projectHandoffPacket: ProjectHandoffPacket | null;
  proofSheet: VendorProductionProofSheet;
}) {
  if (input.status === "ready") {
    return `${input.project.name} is ready to send to the print vendor with dieline, proof, SKU, and artifact evidence.`;
  }

  if (input.project.approvalStatus === "changes-requested") {
    return `Resolve approval changes before sending ${input.project.name} to the vendor.`;
  }

  if (input.printAudit?.status === "fix") {
    return `Resolve print preflight blockers for ${input.project.name}: ${input.printAudit.detail}`;
  }

  if (input.latestExport?.status === "failed") {
    return `Resolve failed print export for ${input.project.name}: ${input.latestExport.failureMessage ?? "retry export"}.`;
  }

  if (input.proofSheet.missingItems.length) {
    return `Complete ${input.proofSheet.missingItems[0]} for ${input.project.name}.`;
  }

  if (input.projectHandoffPacket?.status !== "ready") {
    return `Review the project handoff packet before vendor delivery for ${input.project.name}.`;
  }

  return `Review vendor packet details for ${input.project.name}.`;
}

function createCenterNextActions(handoffs: VendorProductionHandoff[]) {
  const actions = handoffs
    .filter((handoff) => handoff.status !== "ready")
    .map((handoff) => handoff.nextAction);

  if (actions.length) return actions.slice(0, 4);

  return handoffs.length
    ? ["All vendor handoff packets are ready for print production."]
    : [
        "Create a print-ready project and export a print PDF to open vendor handoff.",
      ];
}

function createMissingProofItems(input: {
  project: ProjectSummary;
  printAudit: ProjectAuditSummary["dimensions"][number] | null;
  latestExport: ServerExportJobSummary | null;
}) {
  const items: string[] = [];

  if (!input.project.thumbnail) items.push("artwork thumbnail");
  if (!input.printAudit) items.push("print audit");
  if (input.printAudit?.status === "fix") items.push("print fixes");
  if (!input.latestExport) items.push("print export");
  if (input.latestExport?.status === "failed") items.push("successful export");
  if (input.latestExport && input.latestExport.status !== "completed") {
    items.push("completed export");
  }

  return [...new Set(items)];
}

function getPrintAuditDimension(audit: ProjectAuditSummary | null) {
  return (
    audit?.dimensions.find((dimension) => dimension.id === "print") ?? null
  );
}

function getLatestPrintExport(exportJobs: ServerExportJobSummary[]) {
  return (
    exportJobs
      .filter((job) => printExportFormats.has(job.format))
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime(),
      )[0] ?? null
  );
}

function getExportScore(job: ServerExportJobSummary | null) {
  if (!job) return 45;
  if (job.status === "completed") return job.artifactDataUrl ? 100 : 88;
  if (job.status === "running" || job.status === "queued") return 68;

  return 25;
}

function getApprovalScore(approvalStatus: ProjectSummary["approvalStatus"]) {
  if (approvalStatus === "approved") return 100;
  if (approvalStatus === "in-review") return 72;
  if (approvalStatus === "draft") return 52;

  return 20;
}

function aggregateStatus(
  statuses: VendorProductionHandoffStatus[],
): VendorProductionHandoffStatus {
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

function compareVendorHandoffs(
  left: VendorProductionHandoff,
  right: VendorProductionHandoff,
) {
  const statusDelta = statusRank(left.status) - statusRank(right.status);
  if (statusDelta !== 0) return statusDelta;

  return right.score - left.score;
}

function statusRank(status: VendorProductionHandoffStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

function normalizeDate(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32) || "project"
  );
}

function formatInches(value: number) {
  return `${value
    .toFixed(value % 1 === 0 ? 0 : 3)
    .replace(/0+$/, "")
    .replace(/\.$/, "")}"`;
}

function createJsonDataUrl(payload: unknown) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(payload, null, 2),
  )}`;
}
