import { updateDocumentMetadata } from "@/features/editor/editor-operations";
import {
  createAudienceProfile,
  createConstraint,
  createDecisionLog,
  createReference,
  normalizeText,
} from "@/features/editor/project-knowledge-pack-items";
import {
  projectKnowledgePackTemplates,
  type ProjectKnowledgePackTemplateId,
} from "@/features/editor/project-knowledge-pack-templates";
import type {
  DesignDocument,
  ProjectKnowledgeBrief,
  ProjectKnowledgePack,
} from "@/features/editor/types";

export {
  createAudienceProfile,
  createConstraint,
  createDecisionLog,
  createReference,
  projectKnowledgePackTemplates,
};
export type { ProjectKnowledgePackTemplateId };

export type ProjectKnowledgeCheckStatus = "ready" | "review" | "blocked";

export type ProjectKnowledgePackCheck = {
  id: string;
  label: string;
  status: ProjectKnowledgeCheckStatus;
  detail: string;
};

export type ProjectKnowledgePackSummary = {
  status: ProjectKnowledgeCheckStatus;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  totalCount: number;
  score: number;
};

const fallbackUpdatedAt = "2026-05-16T00:00:00.000Z";

export function createProjectKnowledgePack(input?: {
  templateId?: ProjectKnowledgePackTemplateId;
  projectName?: string;
  now?: string;
}): ProjectKnowledgePack {
  const template =
    projectKnowledgePackTemplates.find(
      (item) => item.id === input?.templateId,
    ) ?? projectKnowledgePackTemplates[0];
  const now = input?.now ?? new Date().toISOString();

  return normalizeProjectKnowledgePack(
    {
      brief: {
        ...template.brief,
        title: input?.projectName
          ? `${input.projectName} knowledge pack`
          : template.brief.title,
      },
      audienceProfiles: template.audienceProfiles,
      constraints: template.constraints,
      references: template.references,
      decisionLogs: template.decisionLogs,
      updatedAt: now,
    },
    { now },
  );
}

export function applyProjectKnowledgePackTemplate(
  document: DesignDocument,
  templateId: ProjectKnowledgePackTemplateId,
  options?: { projectName?: string; now?: string },
) {
  return updateDocumentMetadata(document, {
    projectKnowledgePack: createProjectKnowledgePack({
      templateId,
      projectName: options?.projectName,
      now: options?.now,
    }),
  });
}

export function updateProjectKnowledgePack(
  document: DesignDocument,
  pack: Partial<ProjectKnowledgePack>,
  now = new Date().toISOString(),
) {
  return updateDocumentMetadata(document, {
    projectKnowledgePack: normalizeProjectKnowledgePack(pack, { now }),
  });
}

export function normalizeProjectKnowledgePack(
  pack: Partial<ProjectKnowledgePack> | null | undefined,
  options?: { now?: string },
): ProjectKnowledgePack {
  return {
    brief: normalizeBrief(pack?.brief),
    audienceProfiles: Array.isArray(pack?.audienceProfiles)
      ? pack.audienceProfiles.map(createAudienceProfile)
      : [],
    constraints: Array.isArray(pack?.constraints)
      ? pack.constraints.map(createConstraint)
      : [],
    references: Array.isArray(pack?.references)
      ? pack.references.map(createReference)
      : [],
    decisionLogs: Array.isArray(pack?.decisionLogs)
      ? pack.decisionLogs.map(createDecisionLog)
      : [],
    updatedAt:
      normalizeText(options?.now) ||
      normalizeText(pack?.updatedAt) ||
      fallbackUpdatedAt,
  };
}

export function createProjectKnowledgePackChecks(
  pack: ProjectKnowledgePack,
): ProjectKnowledgePackCheck[] {
  const normalized = normalizeProjectKnowledgePack(pack);
  const brief = normalized.brief;
  const populatedAudiences = normalized.audienceProfiles.filter(
    (item) => item.name && item.need && item.desiredAction,
  );
  const populatedConstraints = normalized.constraints.filter(
    (item) => item.label && item.detail,
  );
  const requiredConstraints = normalized.constraints.filter(
    (item) => item.required,
  );
  const populatedReferences = normalized.references.filter(
    (item) => item.label && (item.url || item.note),
  );
  const populatedDecisions = normalized.decisionLogs.filter(
    (item) => item.title && item.decision,
  );

  return [
    createBriefCheck(brief),
    createCountCheck({
      id: "audience",
      label: "Audience",
      populatedCount: populatedAudiences.length,
      totalCount: normalized.audienceProfiles.length,
      readyDetail: `${populatedAudiences.length} audience profile${populatedAudiences.length === 1 ? "" : "s"} ready.`,
      blockedDetail: "Add at least one audience profile with need and desired action.",
    }),
    {
      id: "constraints",
      label: "Constraints",
      status:
        populatedConstraints.length === 0
          ? "blocked"
          : requiredConstraints.length > populatedConstraints.length
            ? "review"
            : "ready",
      detail:
        populatedConstraints.length > 0
          ? `${populatedConstraints.length} constraint${populatedConstraints.length === 1 ? "" : "s"} documented.`
          : "Add brand, legal, format, timeline, or accessibility constraints.",
    },
    createCountCheck({
      id: "references",
      label: "References",
      populatedCount: populatedReferences.length,
      totalCount: normalized.references.length,
      emptyStatus: "review",
      readyDetail: `${populatedReferences.length} reference${populatedReferences.length === 1 ? "" : "s"} captured.`,
      blockedDetail: "Add source links, research, asset notes, or inspiration references.",
    }),
    createCountCheck({
      id: "decisions",
      label: "Decisions",
      populatedCount: populatedDecisions.length,
      totalCount: normalized.decisionLogs.length,
      emptyStatus: "review",
      readyDetail: `${populatedDecisions.length} decision${populatedDecisions.length === 1 ? "" : "s"} logged.`,
      blockedDetail:
        "Log important creative, brand, publishing, or stakeholder decisions.",
    }),
  ];
}

export function createProjectKnowledgePackSummary(
  pack: ProjectKnowledgePack,
): ProjectKnowledgePackSummary {
  const checks = createProjectKnowledgePackChecks(pack);
  const readyCount = checks.filter((item) => item.status === "ready").length;
  const reviewCount = checks.filter((item) => item.status === "review").length;
  const blockedCount = checks.filter((item) => item.status === "blocked").length;
  const totalCount = checks.length;

  return {
    status: blockedCount ? "blocked" : reviewCount ? "review" : "ready",
    readyCount,
    reviewCount,
    blockedCount,
    totalCount,
    score: Math.round((readyCount / totalCount) * 100),
  };
}

function normalizeBrief(
  brief: Partial<ProjectKnowledgeBrief> | null | undefined,
): ProjectKnowledgeBrief {
  return {
    title: normalizeText(brief?.title) || "Project knowledge pack",
    goal: normalizeText(brief?.goal),
    audiencePromise: normalizeText(brief?.audiencePromise),
    successMetric: normalizeText(brief?.successMetric),
    owner: normalizeText(brief?.owner),
    dueDate: normalizeText(brief?.dueDate),
  };
}

function createBriefCheck(
  brief: ProjectKnowledgeBrief,
): ProjectKnowledgePackCheck {
  const isReady = brief.goal && brief.audiencePromise && brief.successMetric;
  const needsReview = brief.goal || brief.audiencePromise;

  return {
    id: "brief",
    label: "Brief",
    status: isReady ? "ready" : needsReview ? "review" : "blocked",
    detail: isReady
      ? "Goal, promise, and success metric are captured."
      : "Add goal, audience promise, and success metric before handoff.",
  };
}

function createCountCheck({
  id,
  label,
  populatedCount,
  totalCount,
  emptyStatus = "blocked",
  readyDetail,
  blockedDetail,
}: {
  id: string;
  label: string;
  populatedCount: number;
  totalCount: number;
  emptyStatus?: ProjectKnowledgeCheckStatus;
  readyDetail: string;
  blockedDetail: string;
}): ProjectKnowledgePackCheck {
  return {
    id,
    label,
    status:
      populatedCount > 0
        ? totalCount === populatedCount
          ? "ready"
          : "review"
        : emptyStatus,
    detail: populatedCount > 0 ? readyDetail : blockedDetail,
  };
}
