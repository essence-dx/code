export type TemplateQualityQaStatus = "ready" | "review" | "blocked";

export type TemplateQualityQaDomain =
  | "accessibility"
  | "localization"
  | "marketplace"
  | "moderation";

export type TemplateQualityQaPriority = "high" | "medium" | "low";

export type TemplateQualityQaQueue =
  | "accessibility-localization"
  | "marketplace-review"
  | "creator-fixes"
  | "moderator-escalation";

export type TemplateQualityReadiness = {
  id: TemplateQualityQaDomain;
  label: string;
  status: TemplateQualityQaStatus;
  score: number;
  detail: string;
  signals: string[];
};

export type TemplateQualityFixItem = {
  id: string;
  title: string;
  detail: string;
  owner: "creator" | "moderator" | "admin";
  priority: TemplateQualityQaPriority;
  href: string;
};

export type TemplateQualityFixPlan = {
  templateId: string;
  templateName: string;
  status: TemplateQualityQaStatus;
  score: number;
  summary: string;
  items: TemplateQualityFixItem[];
};

export type TemplateQualityModerationRoute = {
  id: string;
  templateId: string;
  templateName: string;
  queue: TemplateQualityQaQueue;
  queueLabel: string;
  status: TemplateQualityQaStatus;
  priority: TemplateQualityQaPriority;
  reason: string;
  openedAt: string;
  href: string;
  signals: string[];
};

export type TemplateQualityProfile = {
  templateId: string;
  templateName: string;
  creatorDetail: string;
  href: string;
  dimensions: string;
  status: TemplateQualityQaStatus;
  score: number;
  updatedAt: string;
  readiness: Record<TemplateQualityQaDomain, TemplateQualityReadiness>;
  fixPlan: TemplateQualityFixPlan;
  stats: {
    uses: number;
    views: number;
    conversionRate: number;
    qualityGateScore: number;
    relatedProjectAudits: number;
  };
};

export type TemplateQualityPacket = {
  fileName: string;
  generatedAt: string;
  dataUrl: string;
};

export type TemplateQualityQaCenter = {
  generatedAt: string;
  status: TemplateQualityQaStatus;
  score: number;
  templateProfiles: TemplateQualityProfile[];
  moderationRoutes: TemplateQualityModerationRoute[];
  creatorFixPlans: TemplateQualityFixPlan[];
  qualityPacket: TemplateQualityPacket;
  nextActions: string[];
  totals: {
    templates: number;
    readyTemplates: number;
    reviewTemplates: number;
    blockedTemplates: number;
    moderationRoutes: number;
    creatorFixes: number;
    accessibilityIssues: number;
    localizationIssues: number;
    marketplaceIssues: number;
  };
};
