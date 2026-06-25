import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { ProjectSummary } from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";

export type VendorProductionHandoffStatus = "ready" | "review" | "blocked";

export type VendorProductFamily =
  | "card"
  | "label"
  | "poster"
  | "sticker"
  | "package-flat";

export type VendorProofView =
  | "trim"
  | "safe-area"
  | "bleed"
  | "front"
  | "back"
  | "roll-repeat"
  | "cutline"
  | "wall-scale"
  | "panel-map"
  | "glue-tab";

export type VendorProductionDielineSpec = {
  id: string;
  productFamily: VendorProductFamily;
  trimWidthInches: number;
  trimHeightInches: number;
  bleedInches: number;
  safeMarginInches: number;
  resolutionDpi: number;
  colorProfile: "CMYK target" | "RGB proof";
  panelCount: number;
  cutPath: string;
  detail: string;
};

export type VendorProductionProofSheet = {
  id: string;
  status: VendorProductionHandoffStatus;
  thumbnail: string | null;
  requiredViews: VendorProofView[];
  printAuditScore: number | null;
  exportArtifactName: string | null;
  missingItems: string[];
  detail: string;
};

export type VendorProductionFinishingNote = {
  id: string;
  label: string;
  detail: string;
  required: boolean;
};

export type VendorProductionSkuMetadata = {
  sku: string;
  packageCode: string;
  revision: string;
  dimensionsLabel: string;
  vendorFileName: string;
};

export type VendorProductionManifestItem = {
  id: string;
  kind: "dieline" | "proof" | "artifact" | "metadata" | "finishing" | "blocker";
  label: string;
  detail: string;
};

export type VendorProductionDeliveryPacket = {
  id: string;
  title: string;
  status: VendorProductionHandoffStatus;
  generatedAt: string;
  manifest: VendorProductionManifestItem[];
  downloadJson: string;
};

export type VendorProductionHandoff = {
  id: string;
  projectId: string;
  projectName: string;
  status: VendorProductionHandoffStatus;
  score: number;
  nextAction: string;
  dieline: VendorProductionDielineSpec;
  proofSheet: VendorProductionProofSheet;
  finishingNotes: VendorProductionFinishingNote[];
  skuMetadata: VendorProductionSkuMetadata;
  deliveryPacket: VendorProductionDeliveryPacket;
};

export type VendorProductionHandoffCenter = {
  status: VendorProductionHandoffStatus;
  score: number;
  generatedAt: string;
  handoffs: VendorProductionHandoff[];
  nextActions: string[];
  totals: {
    projects: number;
    dielineSpecs: number;
    proofSheets: number;
    finishingNotes: number;
    skuPackages: number;
    deliveryPackets: number;
    readyHandoffs: number;
    reviewHandoffs: number;
    blockedHandoffs: number;
  };
};

export type VendorProductionHandoffCenterInput = {
  projects: ProjectSummary[];
  projectAudits: ProjectAuditSummary[];
  serverExportJobs: ServerExportJobSummary[];
  projectHandoffPackets: ProjectHandoffPacket[];
  now?: string | Date;
};
