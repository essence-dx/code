import type { ReviewTaskSummary } from "@/db/project-comments";
import type { RuleBasedLayoutIntelligenceCenter } from "@/features/creation/rule-based-layout-intelligence";
import type { ProfessionalTypographySystemCenter } from "@/features/creation/professional-typography-system";
import type { ProjectSummary } from "@/features/editor/types";
import type { MediaBrandDeliveryKitCenter } from "@/features/media-delivery/media-brand-delivery-kits";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";
import type { VendorProductionHandoffCenter } from "@/features/print-production/vendor-production-handoff";

export type ProjectCoachingStatus = "ready" | "review" | "blocked";

export type ProjectCoachingRecipeCategory =
  | "layout"
  | "typography"
  | "production"
  | "review"
  | "print"
  | "media"
  | "maintenance";

export type ProjectCoachingRecipe = {
  id: string;
  category: ProjectCoachingRecipeCategory;
  status: ProjectCoachingStatus;
  title: string;
  detail: string;
  estimatedMinutes: number;
  steps: string[];
  sourceLabels: string[];
};

export type ProjectCoachingChecklistItemStatus = "done" | "active" | "blocked";

export type ProjectCoachingChecklistItem = {
  id:
    | "layout"
    | "typography"
    | "readiness"
    | "delivery"
    | "approval"
    | "feedback";
  label: string;
  status: ProjectCoachingChecklistItemStatus;
  progressPercent: number;
  detail: string;
};

export type ProjectCoachingChecklist = {
  status: ProjectCoachingStatus;
  progressPercent: number;
  completedItems: number;
  totalItems: number;
  items: ProjectCoachingChecklistItem[];
};

export type ProjectReadinessCoachingCard = {
  id: string;
  dimension: string;
  status: ProjectCoachingStatus;
  score: number;
  coachNote: string;
  nextAction: string;
  source: "audit" | "handoff" | "vendor" | "media" | "review";
};

export type ProjectLearningTrack = {
  id:
    | "layout-craft"
    | "typography-system"
    | "production-readiness"
    | "production-delivery"
    | "review-collaboration";
  label: string;
  status: ProjectCoachingStatus;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  nextLesson: string;
};

export type ProjectLearningDashboard = {
  id: string;
  status: ProjectCoachingStatus;
  progressPercent: number;
  tracks: ProjectLearningTrack[];
};

export type ProjectCoachingPacket = {
  id: string;
  title: string;
  status: ProjectCoachingStatus;
  generatedAt: string;
  downloadJson: string;
};

export type ProjectCoachingSession = {
  id: string;
  projectId: string;
  projectName: string;
  status: ProjectCoachingStatus;
  score: number;
  nextAction: string;
  contextualRecipes: ProjectCoachingRecipe[];
  checklist: ProjectCoachingChecklist;
  readinessCoaching: ProjectReadinessCoachingCard[];
  learningDashboard: ProjectLearningDashboard;
  coachingPacket: ProjectCoachingPacket;
};

export type ProjectCoachingModeCenter = {
  generatedAt: string;
  status: ProjectCoachingStatus;
  score: number;
  sessions: ProjectCoachingSession[];
  nextActions: string[];
  totals: {
    projects: number;
    coachingSessions: number;
    contextualRecipes: number;
    checklistItems: number;
    readinessCards: number;
    learningDashboards: number;
    readySessions: number;
    reviewSessions: number;
    blockedSessions: number;
  };
};

export type ProjectCoachingModeCenterInput = {
  projects: ProjectSummary[];
  layoutIntelligence: RuleBasedLayoutIntelligenceCenter;
  typographySystem: ProfessionalTypographySystemCenter;
  projectAudits: ProjectAuditSummary[];
  projectHandoffPackets: ProjectHandoffPacket[];
  vendorProductionHandoff: VendorProductionHandoffCenter;
  mediaBrandDeliveryKitCenter: MediaBrandDeliveryKitCenter;
  reviewTasks: ReviewTaskSummary[];
  now?: string | Date;
};
