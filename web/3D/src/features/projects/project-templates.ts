import type { SceneDocument } from "@/features/editor/types";
import { createBuiltInTemplateObjects } from "@/features/editor/scene/built-in-templates";
import { createDefaultDocument } from "@/features/editor/scene/default-document";
import {
  defaultShareSettings,
  projectReviewSurfaceKeys,
  updateProjectReviewWorkflow,
  type ProjectReviewSurface,
  type ShareSettings,
} from "@/features/projects/share-settings";

export const projectExportPresetIds = ["full-package", "embed-only", "internal-review"] as const;
export const projectReviewPolicyPresetIds = ["open", "public-review", "release-review"] as const;

export type ProjectExportPresetId = (typeof projectExportPresetIds)[number];
export type ProjectReviewPolicyPresetId = (typeof projectReviewPolicyPresetIds)[number];

export const projectExportPresetLabels: Record<ProjectExportPresetId, string> = {
  "embed-only": "Embed only",
  "full-package": "Full package",
  "internal-review": "Internal review",
};

export const projectReviewPolicyPresetLabels: Record<ProjectReviewPolicyPresetId, string> = {
  open: "Open",
  "public-review": "Public review",
  "release-review": "Release review",
};

export interface ProjectTemplateWorkspaceDefaults {
  folderName: string;
  namePrefix: string;
}

export interface ProjectTemplateDefinition {
  defaultDescription: string;
  defaultName: string;
  exportPresetId: ProjectExportPresetId;
  id: string;
  name: string;
  reviewPolicyPresetId: ProjectReviewPolicyPresetId;
  sceneTemplateId: string | null;
  summary: string;
  workspaceDefaults: ProjectTemplateWorkspaceDefaults;
}

export interface ProjectTemplateOptionSummary {
  defaultName: string;
  exportPresetId: ProjectExportPresetId;
  id: string;
  name: string;
  reviewPolicyPresetId: ProjectReviewPolicyPresetId;
  summary: string;
  workspaceDefaults: ProjectTemplateWorkspaceDefaults;
}

export const projectTemplateDefinitions: ProjectTemplateDefinition[] = [
  {
    defaultDescription: "Review-ready product scene with public-link approval and full package exports prepared.",
    defaultName: "Product Launch Review",
    exportPresetId: "full-package",
    id: "product-launch-review",
    name: "Product Launch",
    reviewPolicyPresetId: "public-review",
    sceneTemplateId: "product-podium",
    summary: "Product podium, public review gate, full package exports.",
    workspaceDefaults: {
      folderName: "Launch Reviews",
      namePrefix: "Launch",
    },
  },
  {
    defaultDescription: "Responsive embedded interface scene with code/API exports disabled until the team approves it.",
    defaultName: "Interface Embed",
    exportPresetId: "embed-only",
    id: "interface-embed",
    name: "Interface Embed",
    reviewPolicyPresetId: "public-review",
    sceneTemplateId: "glass-interface-stack",
    summary: "Glass UI starter, responsive embed settings, public review workflow.",
    workspaceDefaults: {
      folderName: "Embeds",
      namePrefix: "Embed",
    },
  },
  {
    defaultDescription: "Desktop and app package release candidate with release surfaces sent to review.",
    defaultName: "Release Candidate",
    exportPresetId: "full-package",
    id: "release-candidate",
    name: "Release Candidate",
    reviewPolicyPresetId: "release-review",
    sceneTemplateId: "studio-light-rig",
    summary: "Release approval workflow, package-ready exports, studio lighting.",
    workspaceDefaults: {
      folderName: "Release Candidates",
      namePrefix: "Release",
    },
  },
  {
    defaultDescription: "Private workspace draft for asset QA, comments, and internal review before publishing is enabled.",
    defaultName: "Asset QA Board",
    exportPresetId: "internal-review",
    id: "asset-qa-board",
    name: "Asset QA",
    reviewPolicyPresetId: "open",
    sceneTemplateId: "gallery-wall",
    summary: "Gallery starter, private exports, review-friendly workspace defaults.",
    workspaceDefaults: {
      folderName: "Asset QA",
      namePrefix: "QA",
    },
  },
];

export const projectTemplateOptions: ProjectTemplateOptionSummary[] = projectTemplateDefinitions.map((template) => ({
  defaultName: template.defaultName,
  exportPresetId: template.exportPresetId,
  id: template.id,
  name: template.name,
  reviewPolicyPresetId: template.reviewPolicyPresetId,
  summary: template.summary,
  workspaceDefaults: template.workspaceDefaults,
}));

function createFreshShareSettings(): ShareSettings {
  return {
    ...defaultShareSettings,
    reviewWorkflow: Object.fromEntries(projectReviewSurfaceKeys.map((surface) => [surface, { ...defaultShareSettings.reviewWorkflow[surface] }])) as ShareSettings["reviewWorkflow"],
  };
}

function requestReview(settings: ShareSettings, surfaces: ProjectReviewSurface[], note: string, updatedAt: string) {
  return surfaces.reduce((workflow, surface) => updateProjectReviewWorkflow(workflow, surface, "requested", { note, updatedAt }), settings.reviewWorkflow);
}

export function applyProjectExportPreset(settings: ShareSettings, presetId: ProjectExportPresetId): ShareSettings {
  if (presetId === "embed-only") {
    return {
      ...settings,
      allowCodeExport: false,
      allowEmbed: true,
      allowPublicApi: false,
      allowView: true,
      allowViewerDownload: false,
      embedLayout: "responsive",
      embedShowGrid: false,
      embedShowNavigation: true,
      embedTransparentBackground: true,
    };
  }

  if (presetId === "internal-review") {
    return {
      ...settings,
      allowCodeExport: false,
      allowEmbed: false,
      allowPublicApi: false,
      allowView: true,
      allowViewerDownload: false,
    };
  }

  return {
    ...settings,
    allowCodeExport: true,
    allowEmbed: true,
    allowPublicApi: true,
    allowView: true,
    allowViewerDownload: true,
  };
}

export function applyProjectReviewPolicyPreset(settings: ShareSettings, presetId: ProjectReviewPolicyPresetId, updatedAt: string): ShareSettings {
  if (presetId === "public-review") {
    return {
      ...settings,
      reviewWorkflow: requestReview(settings, ["publicLink", "embed"], "Template requires public surfaces to be approved before publishing.", updatedAt),
    };
  }

  if (presetId === "release-review") {
    return {
      ...settings,
      reviewWorkflow: requestReview(settings, ["desktopRelease", "appPackage"], "Template requires release surfaces to be approved before package export.", updatedAt),
    };
  }

  return settings;
}

export function getProjectTemplateDefinition(templateId: string | null | undefined) {
  return projectTemplateDefinitions.find((template) => template.id === templateId) ?? null;
}

function createTemplateDocument(name: string, template: ProjectTemplateDefinition, now: string): SceneDocument {
  const document = createDefaultDocument(name);
  const starter = template.sceneTemplateId ? createBuiltInTemplateObjects(template.sceneTemplateId) : null;

  return {
    ...document,
    name,
    objects: starter ? [...document.objects, ...starter.objects] : document.objects,
    updatedAt: now,
  };
}

export function createProjectTemplatePayload(input: {
  exportPresetId?: string | null;
  name?: string | null;
  reviewPolicyPresetId?: string | null;
  templateId?: string | null;
}) {
  const template = getProjectTemplateDefinition(input.templateId) ?? projectTemplateDefinitions[0];
  const now = new Date().toISOString();
  const name = input.name?.trim() || template.defaultName;
  const exportPresetId = projectExportPresetIds.find((presetId) => presetId === input.exportPresetId) ?? template.exportPresetId;
  const reviewPolicyPresetId = projectReviewPolicyPresetIds.find((presetId) => presetId === input.reviewPolicyPresetId) ?? template.reviewPolicyPresetId;
  const shareSettings = applyProjectReviewPolicyPreset(applyProjectExportPreset(createFreshShareSettings(), exportPresetId), reviewPolicyPresetId, now);

  return {
    description: template.defaultDescription,
    sceneData: createTemplateDocument(name, template, now),
    shareSettings,
    template,
  };
}
