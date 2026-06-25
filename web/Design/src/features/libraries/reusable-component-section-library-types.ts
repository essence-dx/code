import type { ProjectSummary } from "@/features/editor/types";
import type {
  DesignSystemComponentDefinition,
  DesignSystemIntelligenceCenter,
} from "@/features/design-system/design-system-intelligence";
import type { DesignSystemReleaseGovernanceCenter } from "@/features/design-system/design-system-release-governance";
import type { TemplateInstancePropagationCenter } from "@/features/templates/template-instance-propagation";

export type ReusableLibraryStatus = "ready" | "review" | "blocked";

export type ReusableSectionKind =
  | "hero"
  | "navigation"
  | "pricing"
  | "testimonial"
  | "data"
  | "media"
  | "content"
  | "utility";

export type ReusableVersionVariantSource =
  | "template"
  | "project-snapshot"
  | "project-instance";

export type ReusableComponentVersionVariant = {
  id: string;
  label: string;
  source: ReusableVersionVariantSource;
  status: ReusableLibraryStatus;
  projectId: string | null;
  versionId: string | null;
  updatedAt: string;
  detail: string;
};

export type ReusableDependencyUpdatePlan = {
  id: string;
  templateId: string;
  status: ReusableLibraryStatus;
  affectedProjectIds: string[];
  tokenMigrationPlanIds: string[];
  instancePreviewIds: string[];
  publicSurfaces: number;
  blockers: string[];
  recommendedUpdates: string[];
};

export type ReusableSafeInsertGateKind =
  | "token"
  | "approval"
  | "usage"
  | "rollback"
  | "audit"
  | "public-surface"
  | "dependency"
  | "version";

export type ReusableSafeInsertGate = {
  id: string;
  kind: ReusableSafeInsertGateKind;
  status: ReusableLibraryStatus;
  label: string;
  detail: string;
};

export type ReusableSafeInsertPlan = {
  id: string;
  status: ReusableLibraryStatus;
  score: number;
  targetFormats: string[];
  requiredGates: ReusableSafeInsertGate[];
  insertSteps: string[];
  nextAction: string;
};

export type ReusableInsertPacket = {
  id: string;
  title: string;
  status: ReusableLibraryStatus;
  generatedAt: string;
  downloadJson: string;
};

export type ReusableComponentLibrary = {
  id: string;
  templateId: string;
  componentId: string;
  name: string;
  kind: DesignSystemComponentDefinition["kind"];
  sectionKind: ReusableSectionKind;
  status: ReusableLibraryStatus;
  score: number;
  href: string;
  tokenCoverage: DesignSystemComponentDefinition["tokenCoverage"];
  usage: DesignSystemComponentDefinition["usage"];
  versionedVariants: ReusableComponentVersionVariant[];
  dependencyUpdatePlan: ReusableDependencyUpdatePlan;
  safeInsertPlan: ReusableSafeInsertPlan;
  insertPacket: ReusableInsertPacket;
};

export type ReusableSectionLibrary = {
  id: string;
  kind: ReusableSectionKind;
  label: string;
  status: ReusableLibraryStatus;
  score: number;
  componentIds: string[];
  templateIds: string[];
  variantCount: number;
  targetFormats: string[];
  safeInsertPlanIds: string[];
  insertPacket: ReusableInsertPacket;
  nextAction: string;
};

export type ReusableComponentSectionLibraryCenter = {
  generatedAt: string;
  status: ReusableLibraryStatus;
  score: number;
  componentLibraries: ReusableComponentLibrary[];
  sectionLibraries: ReusableSectionLibrary[];
  dependencyUpdatePlans: ReusableDependencyUpdatePlan[];
  safeInsertPlans: ReusableSafeInsertPlan[];
  nextActions: string[];
  totals: {
    componentLibraries: number;
    sectionLibraries: number;
    versionedVariants: number;
    dependencyUpdatePlans: number;
    safeInsertPlans: number;
    blockedInsertPlans: number;
    reviewInsertPlans: number;
    readyInsertPlans: number;
  };
};

export type ReusableComponentSectionLibraryInput = {
  templates: Array<{
    id: string;
    name: string;
    width: number;
    height: number;
    approvalStatus: ProjectSummary["approvalStatus"];
    marketplaceStatus: string;
    marketplaceUseCount: number;
    marketplaceViewCount: number;
    updatedAt: string;
  }>;
  projects: ProjectSummary[];
  projectVersions: Array<{
    id: string;
    projectId: string;
    createdAt: string;
  }>;
  designSystem: DesignSystemIntelligenceCenter;
  releaseGovernance: DesignSystemReleaseGovernanceCenter;
  templateInstancePropagation: TemplateInstancePropagationCenter;
  now?: string | Date;
};
