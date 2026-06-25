import type { WebsitePublishSummary } from "@/db/website-publishing";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  AssetAuditRecord,
  AssetLibraryAudit,
} from "@/features/assets/asset-library-audit";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { ProjectSummary } from "@/features/editor/types";
import {
  defaultRestrictedAssetKeywords,
  defaultRestrictedExportFormats,
  type ComplianceEvidencePacket,
  type DataResidencyExportControlsCenter,
  type DataResidencyPolicyConfig,
  type DataResidencyRegion,
  type DataResidencyScope,
  type DataResidencyStatus,
  type ExportControlReport,
  type RegionPolicyPreview,
  type RestrictedAssetCheck,
} from "@/features/compliance/data-residency-export-controls-types";

export type {
  ComplianceEvidencePacket,
  DataResidencyExportControlsCenter,
  DataResidencyPolicyConfig,
  DataResidencyRegion,
  DataResidencyScope,
  DataResidencyStatus,
  ExportControlReport,
  RegionPolicyPreview,
  RestrictedAssetCheck,
} from "@/features/compliance/data-residency-export-controls-types";

export type DataResidencyExportControlsInput = {
  projects: ProjectSummary[];
  assetAudit: AssetLibraryAudit;
  serverExportJobs: ServerExportJobSummary[];
  websitePublishes: WebsitePublishSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  policy?: DataResidencyPolicyConfig;
  now?: string | Date;
};

type NormalizedPolicy = {
  homeRegion: DataResidencyRegion;
  allowedRegions: DataResidencyRegion[];
  exportRegionByJobId: Record<string, DataResidencyRegion>;
  projectRegionById: Record<string, DataResidencyRegion>;
  domainRegionByDomain: Record<string, DataResidencyRegion>;
  restrictedAssetKeywords: string[];
  restrictedExportFormats: string[];
};

export function createDataResidencyExportControlsCenter(
  input: DataResidencyExportControlsInput,
): DataResidencyExportControlsCenter {
  const checkedAt = normalizeNow(input.now).toISOString();
  const policy = normalizePolicy(input.policy);
  const projectsById = new Map(
    input.projects.map((project) => [project.id, project]),
  );
  const regionPolicyPreviews = [
    ...createExportRegionPreviews({
      jobs: input.serverExportJobs,
      projectsById,
      policy,
    }),
    ...createDomainRegionPreviews({
      publishes: input.websitePublishes,
      policy,
    }),
  ];
  const restrictedAssetChecks = createRestrictedAssetChecks({
    assetAudit: input.assetAudit,
    policy,
  });
  const exportControlReports = createExportControlReports({
    jobs: input.serverExportJobs,
    regionPolicyPreviews,
    restrictedAssetChecks,
    policy,
  });
  const allStatuses = [
    ...regionPolicyPreviews.map((preview) => preview.status),
    ...restrictedAssetChecks.map((check) => check.status),
    ...exportControlReports.map((report) => report.status),
  ];
  const blockedControls = allStatuses.filter(
    (status) => status === "blocked",
  ).length;
  const reviewControls = allStatuses.filter((status) => status === "review")
    .length;
  const status = createStatus({ blocked: blockedControls, review: reviewControls });
  const auditLogIds = findAuditIds({
    auditLogs: input.auditLogs,
    regionPolicyPreviews,
    restrictedAssetChecks,
    exportControlReports,
  });
  const complianceEvidencePacket = createComplianceEvidencePacket({
    checkedAt,
    status,
    policy,
    regionPolicyPreviews,
    restrictedAssetChecks,
    exportControlReports,
    auditLogIds,
  });

  return {
    status,
    score: scoreControls({
      totalControls: Math.max(allStatuses.length, 1),
      blockedControls,
      reviewControls,
    }),
    checkedAt,
    policy: {
      homeRegion: policy.homeRegion,
      allowedRegions: policy.allowedRegions,
      restrictedAssetKeywords: policy.restrictedAssetKeywords,
      restrictedExportFormats: policy.restrictedExportFormats,
    },
    regionPolicyPreviews,
    restrictedAssetChecks,
    exportControlReports,
    complianceEvidencePacket,
    nextActions: createNextActions({
      regionPolicyPreviews,
      restrictedAssetChecks,
      exportControlReports,
    }),
    totals: {
      allowedRegions: policy.allowedRegions.length,
      regionPreviews: regionPolicyPreviews.length,
      restrictedAssets: restrictedAssetChecks.length,
      exportReports: exportControlReports.length,
      blockedControls,
      reviewControls,
      auditEvents: auditLogIds.length,
    },
  };
}

function createExportRegionPreviews(input: {
  jobs: ServerExportJobSummary[];
  projectsById: Map<string, ProjectSummary>;
  policy: NormalizedPolicy;
}): RegionPolicyPreview[] {
  return input.jobs
    .filter((job) => job.status === "completed")
    .map((job) => {
      const project = input.projectsById.get(job.projectId);
      const detectedRegion = detectExportRegion({
        job,
        project,
        policy: input.policy,
      });

      return createRegionPolicyPreview({
        id: `export-${job.id}`,
        scope: "export",
        label: `${job.projectName} ${job.formatLabel} export`,
        sourceId: job.id,
        projectId: job.projectId,
        detectedRegion,
        allowedRegions: input.policy.allowedRegions,
        readyEvidence: `${job.formatLabel} export artifact is assigned to ${regionLabel(detectedRegion)}.`,
      });
    });
}

function createDomainRegionPreviews(input: {
  publishes: WebsitePublishSummary[];
  policy: NormalizedPolicy;
}): RegionPolicyPreview[] {
  return input.publishes.flatMap((publish) =>
    publish.customDomains.map((domain) => {
      const detectedRegion =
        input.policy.domainRegionByDomain[domain.domain.toLowerCase()] ??
        inferDomainRegion(domain.domain);

      return createRegionPolicyPreview({
        id: `domain-${domain.id}`,
        scope: "domain",
        label: `${publish.title} domain ${domain.domain}`,
        sourceId: domain.id,
        projectId: publish.projectId,
        detectedRegion,
        allowedRegions: input.policy.allowedRegions,
        readyEvidence: `${domain.domain} resolves to ${regionLabel(detectedRegion)} policy scope.`,
      });
    }),
  );
}

function createRegionPolicyPreview(input: {
  id: string;
  scope: DataResidencyScope;
  label: string;
  sourceId: string;
  projectId: string | null;
  detectedRegion: DataResidencyRegion;
  allowedRegions: DataResidencyRegion[];
  readyEvidence: string;
}): RegionPolicyPreview {
  const isUnknown = input.detectedRegion === "unknown";
  const isAllowed =
    !isUnknown &&
    (input.detectedRegion === "global" ||
      input.allowedRegions.includes(input.detectedRegion));
  const status = isAllowed ? "ready" : isUnknown ? "review" : "blocked";
  const evidence = isAllowed
    ? [
        input.readyEvidence,
        `Allowed regions: ${formatRegionList(input.allowedRegions)}.`,
      ]
    : isUnknown
      ? [
          `${input.label} does not have a known residency region.`,
          "Assign a workspace region before export or domain rollout.",
        ]
      : [
          `${input.label} is in ${regionLabel(input.detectedRegion)}, outside allowed regions ${formatRegionList(input.allowedRegions)}.`,
        ];

  return {
    id: input.id,
    scope: input.scope,
    label: input.label,
    sourceId: input.sourceId,
    projectId: input.projectId,
    detectedRegion: input.detectedRegion,
    allowedRegions: input.allowedRegions,
    status,
    evidence,
    nextAction:
      status === "ready"
        ? null
        : status === "blocked"
          ? `Move ${input.label} into an allowed data region before release.`
          : `Assign an explicit data region for ${input.label}.`,
  };
}

function createRestrictedAssetChecks(input: {
  assetAudit: AssetLibraryAudit;
  policy: NormalizedPolicy;
}): RestrictedAssetCheck[] {
  return input.assetAudit.records
    .filter((asset) => asset.scope !== "projects")
    .map((asset) => createRestrictedAssetCheck(asset, input.policy))
    .filter((check): check is RestrictedAssetCheck => Boolean(check));
}

function createRestrictedAssetCheck(
  asset: AssetAuditRecord,
  policy: NormalizedPolicy,
): RestrictedAssetCheck | null {
  const licenseText = [
    asset.licenseName,
    asset.licenseUrl,
    asset.sourceProvider,
    asset.sourceUrl,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const restrictions = policy.restrictedAssetKeywords
    .filter((keyword) => licenseText.includes(keyword.toLowerCase()))
    .map(
      (keyword) => `Restricted asset keyword: ${formatRestrictionKeyword(keyword)}`,
    );
  const missingEvidence = [
    !asset.sourceProvider ? "source provider missing" : null,
    !asset.sourceUrl ? "source URL missing" : null,
    !asset.authorName ? "author missing" : null,
    !asset.licenseName ? "license missing" : null,
    !asset.licenseUrl ? "license URL missing" : null,
  ].filter((value): value is string => Boolean(value));

  if (!restrictions.length && !missingEvidence.length) return null;

  const status = restrictions.length ? "blocked" : "review";
  const sourceRegion = inferUrlRegion(asset.sourceUrl);

  return {
    id: `asset-${asset.id}`,
    assetId: asset.id,
    assetName: asset.name,
    status,
    restrictions: [...restrictions, ...missingEvidence],
    sourceRegion,
    exportSafe: false,
    evidence: [
      asset.licenseName
        ? `License: ${asset.licenseName}`
        : "License evidence is missing.",
      asset.sourceProvider
        ? `Source: ${asset.sourceProvider}`
        : "Source provider is missing.",
      `Source region: ${regionLabel(sourceRegion)}.`,
    ],
    nextAction:
      status === "blocked"
        ? `Remove or replace restricted asset ${asset.name} before exporting controlled deliverables.`
        : `Complete source and license evidence for ${asset.name}.`,
  };
}

function createExportControlReports(input: {
  jobs: ServerExportJobSummary[];
  regionPolicyPreviews: RegionPolicyPreview[];
  restrictedAssetChecks: RestrictedAssetCheck[];
  policy: NormalizedPolicy;
}): ExportControlReport[] {
  const previewsByJobId = new Map(
    input.regionPolicyPreviews
      .filter((preview) => preview.scope === "export")
      .map((preview) => [preview.sourceId, preview]),
  );
  const blockedRestrictedAssets = input.restrictedAssetChecks.filter(
    (check) => check.status === "blocked",
  ).length;

  return input.jobs
    .filter((job) => job.status === "completed")
    .map((job) => {
      const preview = previewsByJobId.get(job.id);
      const region = preview?.detectedRegion ?? "unknown";
      const restrictedFormat = input.policy.restrictedExportFormats.includes(
        job.format,
      );
      const storedArtifact = Boolean(job.artifactDataUrl);
      const status = createExportReportStatus({
        regionStatus: preview?.status ?? "review",
        restrictedFormat,
        storedArtifact,
        blockedRestrictedAssets,
      });
      const evidence = [
        `${job.formatLabel} export ${storedArtifact ? "has" : "does not have"} a stored artifact.`,
        `Export region: ${regionLabel(region)}.`,
        restrictedFormat
          ? `${job.formatLabel} is a controlled export format.`
          : `${job.formatLabel} is not configured as a restricted format.`,
        `${blockedRestrictedAssets} blocked restricted asset checks currently apply.`,
      ];

      return {
        id: `export-control-${job.id}`,
        exportJobId: job.id,
        projectId: job.projectId,
        projectName: job.projectName,
        format: job.format,
        region,
        status,
        storedArtifact,
        restrictedAssetCount: blockedRestrictedAssets,
        evidence,
        nextAction:
          status === "ready"
            ? null
            : `Review data residency and restricted asset controls before sharing ${job.projectName}.`,
      };
    });
}

function createExportReportStatus(input: {
  regionStatus: DataResidencyStatus;
  restrictedFormat: boolean;
  storedArtifact: boolean;
  blockedRestrictedAssets: number;
}) {
  if (input.regionStatus === "blocked" || input.blockedRestrictedAssets > 0) {
    return "blocked";
  }

  if (
    input.regionStatus === "review" ||
    (input.restrictedFormat && input.storedArtifact)
  ) {
    return "review";
  }

  return "ready";
}

function createComplianceEvidencePacket(input: {
  checkedAt: string;
  status: DataResidencyStatus;
  policy: NormalizedPolicy;
  regionPolicyPreviews: RegionPolicyPreview[];
  restrictedAssetChecks: RestrictedAssetCheck[];
  exportControlReports: ExportControlReport[];
  auditLogIds: string[];
}): ComplianceEvidencePacket {
  const packet = {
    id: "data-residency-export-controls-packet",
    generatedAt: input.checkedAt,
    status: input.status,
    policy: {
      homeRegion: input.policy.homeRegion,
      allowedRegions: input.policy.allowedRegions,
      restrictedAssetKeywords: input.policy.restrictedAssetKeywords,
      restrictedExportFormats: input.policy.restrictedExportFormats,
    },
    regionPolicyPreviews: input.regionPolicyPreviews,
    restrictedAssetChecks: input.restrictedAssetChecks,
    exportControlReports: input.exportControlReports,
    auditLogIds: input.auditLogIds,
  };
  const json = JSON.stringify(packet, null, 2);

  return {
    id: packet.id,
    status: input.status,
    generatedAt: input.checkedAt,
    regionPreviewIds: input.regionPolicyPreviews.map((preview) => preview.id),
    restrictedAssetIds: input.restrictedAssetChecks.map((check) => check.assetId),
    exportReportIds: input.exportControlReports.map((report) => report.id),
    auditLogIds: input.auditLogIds,
    download: {
      fileName: "data-residency-export-controls-packet.json",
      href: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
      json,
    },
  };
}

function detectExportRegion(input: {
  job: ServerExportJobSummary;
  project: ProjectSummary | undefined;
  policy: NormalizedPolicy;
}): DataResidencyRegion {
  return (
    input.policy.exportRegionByJobId[input.job.id] ??
    input.policy.projectRegionById[input.job.projectId] ??
    (input.project ? input.policy.projectRegionById[input.project.id] : null) ??
    input.policy.homeRegion
  );
}

function normalizePolicy(
  policy: DataResidencyPolicyConfig | undefined,
): NormalizedPolicy {
  const homeRegion = policy?.homeRegion ?? "global";
  const allowedRegions = dedupeRegions(
    policy?.allowedRegions?.length
      ? policy.allowedRegions
      : ["global", "us", "eu", "apac"],
  );

  return {
    homeRegion,
    allowedRegions,
    exportRegionByJobId: policy?.exportRegionByJobId ?? {},
    projectRegionById: policy?.projectRegionById ?? {},
    domainRegionByDomain: Object.fromEntries(
      Object.entries(policy?.domainRegionByDomain ?? {}).map(([domain, region]) => [
        domain.toLowerCase(),
        region,
      ]),
    ),
    restrictedAssetKeywords:
      policy?.restrictedAssetKeywords ?? defaultRestrictedAssetKeywords,
    restrictedExportFormats:
      policy?.restrictedExportFormats ?? defaultRestrictedExportFormats,
  };
}

function findAuditIds(input: {
  auditLogs: WorkspaceAuditLogSummary[];
  regionPolicyPreviews: RegionPolicyPreview[];
  restrictedAssetChecks: RestrictedAssetCheck[];
  exportControlReports: ExportControlReport[];
}) {
  const sourceIds = new Set([
    ...input.regionPolicyPreviews.flatMap((preview) => [
      preview.sourceId,
      preview.projectId,
    ]),
    ...input.restrictedAssetChecks.map((check) => check.assetId),
    ...input.exportControlReports.flatMap((report) => [
      report.exportJobId,
      report.projectId,
    ]),
  ].filter((value): value is string => Boolean(value)));

  return input.auditLogs
    .filter(
      (log) =>
        (log.targetId && sourceIds.has(log.targetId)) ||
        (typeof log.metadata.projectId === "string" &&
          sourceIds.has(log.metadata.projectId)) ||
        (typeof log.metadata.exportJobId === "string" &&
          sourceIds.has(log.metadata.exportJobId)),
    )
    .map((log) => log.id);
}

function createNextActions(input: {
  regionPolicyPreviews: RegionPolicyPreview[];
  restrictedAssetChecks: RestrictedAssetCheck[];
  exportControlReports: ExportControlReport[];
}) {
  return [
    ...input.regionPolicyPreviews.flatMap((preview) =>
      preview.nextAction ? [preview.nextAction] : [],
    ),
    ...input.restrictedAssetChecks.flatMap((check) =>
      check.nextAction ? [check.nextAction] : [],
    ),
    ...input.exportControlReports.flatMap((report) =>
      report.nextAction ? [report.nextAction] : [],
    ),
  ].slice(0, 6);
}

function inferDomainRegion(domain: string): DataResidencyRegion {
  const normalized = domain.toLowerCase();
  if (/\.(eu|de|fr|nl|es|it|ie|se|fi|dk|be|pl)$/.test(normalized)) return "eu";
  if (/\.(sg|bd|in|jp|kr|au|nz|id|my|ph|th)$/.test(normalized)) {
    return "apac";
  }
  if (/\.(us)$/.test(normalized)) return "us";
  if (/\.(com|org|net|app|dev|io)$/.test(normalized)) return "global";

  return "unknown";
}

function inferUrlRegion(value: string | null): DataResidencyRegion {
  if (!value) return "unknown";

  try {
    return inferDomainRegion(new URL(value).hostname);
  } catch {
    return "unknown";
  }
}

function createStatus(input: { blocked: number; review: number }) {
  if (input.blocked > 0) return "blocked";
  if (input.review > 0) return "review";

  return "ready";
}

function scoreControls(input: {
  totalControls: number;
  blockedControls: number;
  reviewControls: number;
}) {
  const penalty = input.blockedControls * 18 + input.reviewControls * 8;

  return Math.max(0, Math.round(100 - penalty / input.totalControls));
}

function normalizeNow(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function dedupeRegions(regions: DataResidencyRegion[]) {
  return Array.from(new Set(regions));
}

function formatRegionList(regions: DataResidencyRegion[]) {
  return regions.map(regionLabel).join(", ");
}

function regionLabel(region: DataResidencyRegion) {
  const labels: Record<DataResidencyRegion, string> = {
    global: "Global",
    us: "United States",
    eu: "European Union",
    apac: "Asia Pacific",
    unknown: "Unknown",
  };

  return labels[region];
}

function formatRestrictionKeyword(keyword: string) {
  return keyword
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
