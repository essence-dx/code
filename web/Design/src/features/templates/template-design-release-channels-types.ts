export type TemplateDesignReleaseStatus = "ready" | "review" | "blocked";

export type TemplateDesignReleaseChannelId = "canary" | "beta" | "stable";

export type TemplateDesignReleaseDependencyProject = {
  projectId: string;
  projectName: string;
  relation: "source" | "name" | "dimensions";
  status: TemplateDesignReleaseStatus;
  versionCount: number;
  latestVersionAt: string | null;
  publicSurface: boolean;
  href: string;
};

export type TemplateDesignReleaseDependencyImpact = {
  id: string;
  templateId: string;
  templateName: string;
  status: TemplateDesignReleaseStatus;
  affectedProjects: number;
  restorableProjects: number;
  blockedProjects: number;
  publicSurfaces: number;
  detail: string;
  projects: TemplateDesignReleaseDependencyProject[];
};

export type TemplateDesignDeprecationNotice = {
  id: string;
  templateId: string;
  templateName: string;
  status: TemplateDesignReleaseStatus;
  title: string;
  detail: string;
  effectiveAt: string;
  replacementTemplateId: string | null;
  replacementTemplateName: string | null;
  audience: string[];
};

export type TemplateDesignMigrationSuggestion = {
  id: string;
  fromTemplateId: string;
  fromTemplateName: string;
  toTemplateId: string;
  toTemplateName: string;
  status: TemplateDesignReleaseStatus;
  confidence: number;
  reason: string;
  affectedProjectIds: string[];
};

export type TemplateDesignRollbackPacket = {
  id: string;
  templateId: string;
  templateName: string;
  status: TemplateDesignReleaseStatus;
  previousVersion: string;
  fileName: string;
  dataUrl: string;
  steps: string[];
  impactedProjectIds: string[];
};

export type TemplateDesignReleaseEntry = {
  id: string;
  templateId: string;
  templateName: string;
  href: string;
  version: string;
  channelId: TemplateDesignReleaseChannelId;
  channelLabel: string;
  stageLabel: string;
  rolloutPercent: number;
  status: TemplateDesignReleaseStatus;
  score: number;
  marketplaceLabel: string;
  approvalLabel: string;
  dependencyImpact: TemplateDesignReleaseDependencyImpact;
  deprecationNotice: TemplateDesignDeprecationNotice | null;
  migrationSuggestions: TemplateDesignMigrationSuggestion[];
  rollbackPacket: TemplateDesignRollbackPacket;
  nextAction: string;
};

export type TemplateDesignReleaseChannel = {
  id: TemplateDesignReleaseChannelId;
  label: string;
  description: string;
  rolloutPercent: number;
  status: TemplateDesignReleaseStatus;
  entries: TemplateDesignReleaseEntry[];
  summary: string;
};

export type TemplateDesignReleaseChannelsCenter = {
  generatedAt: string;
  status: TemplateDesignReleaseStatus;
  score: number;
  releaseEntries: TemplateDesignReleaseEntry[];
  channels: TemplateDesignReleaseChannel[];
  deprecationNotices: TemplateDesignDeprecationNotice[];
  migrationSuggestions: TemplateDesignMigrationSuggestion[];
  dependencyImpacts: TemplateDesignReleaseDependencyImpact[];
  rollbackPackets: TemplateDesignRollbackPacket[];
  nextActions: string[];
  totals: {
    templates: number;
    channels: number;
    stagedRollouts: number;
    deprecationNotices: number;
    migrationSuggestions: number;
    dependencyImpacts: number;
    rollbackSafePackets: number;
    affectedProjects: number;
    publicSurfaces: number;
  };
};
