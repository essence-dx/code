export type DataResidencyStatus = "ready" | "review" | "blocked";

export type DataResidencyRegion = "global" | "us" | "eu" | "apac" | "unknown";

export type DataResidencyScope = "export" | "domain" | "project";

export type DataResidencyPolicyConfig = {
  homeRegion?: DataResidencyRegion;
  allowedRegions?: DataResidencyRegion[];
  exportRegionByJobId?: Record<string, DataResidencyRegion>;
  projectRegionById?: Record<string, DataResidencyRegion>;
  domainRegionByDomain?: Record<string, DataResidencyRegion>;
  restrictedAssetKeywords?: string[];
  restrictedExportFormats?: string[];
};

export type RegionPolicyPreview = {
  id: string;
  scope: DataResidencyScope;
  label: string;
  sourceId: string;
  projectId: string | null;
  detectedRegion: DataResidencyRegion;
  allowedRegions: DataResidencyRegion[];
  status: DataResidencyStatus;
  evidence: string[];
  nextAction: string | null;
};

export type RestrictedAssetCheck = {
  id: string;
  assetId: string;
  assetName: string;
  status: DataResidencyStatus;
  restrictions: string[];
  sourceRegion: DataResidencyRegion;
  exportSafe: boolean;
  evidence: string[];
  nextAction: string | null;
};

export type ExportControlReport = {
  id: string;
  exportJobId: string;
  projectId: string;
  projectName: string;
  format: string;
  region: DataResidencyRegion;
  status: DataResidencyStatus;
  storedArtifact: boolean;
  restrictedAssetCount: number;
  evidence: string[];
  nextAction: string | null;
};

export type ComplianceEvidencePacket = {
  id: string;
  status: DataResidencyStatus;
  generatedAt: string;
  regionPreviewIds: string[];
  restrictedAssetIds: string[];
  exportReportIds: string[];
  auditLogIds: string[];
  download: {
    fileName: string;
    href: string;
    json: string;
  };
};

export type DataResidencyExportControlsCenter = {
  status: DataResidencyStatus;
  score: number;
  checkedAt: string;
  policy: {
    homeRegion: DataResidencyRegion;
    allowedRegions: DataResidencyRegion[];
    restrictedAssetKeywords: string[];
    restrictedExportFormats: string[];
  };
  regionPolicyPreviews: RegionPolicyPreview[];
  restrictedAssetChecks: RestrictedAssetCheck[];
  exportControlReports: ExportControlReport[];
  complianceEvidencePacket: ComplianceEvidencePacket;
  nextActions: string[];
  totals: {
    allowedRegions: number;
    regionPreviews: number;
    restrictedAssets: number;
    exportReports: number;
    blockedControls: number;
    reviewControls: number;
    auditEvents: number;
  };
};

export const defaultRestrictedAssetKeywords = [
  "editorial",
  "restricted",
  "noncommercial",
  "non-commercial",
  "no derivatives",
  "personal use",
];

export const defaultRestrictedExportFormats = ["mp4", "gif", "media-sequence"];
