import { nanoid } from "nanoid";

import type {
  ProjectKnowledgeAudienceProfile,
  ProjectKnowledgeConstraint,
  ProjectKnowledgeConstraintKind,
  ProjectKnowledgeDecisionLog,
  ProjectKnowledgeReference,
  ProjectKnowledgeReferenceKind,
} from "@/features/editor/types";

export function createAudienceProfile(
  input: Partial<ProjectKnowledgeAudienceProfile> = {},
): ProjectKnowledgeAudienceProfile {
  return {
    id: normalizeText(input.id) || `aud_${nanoid(8)}`,
    name: normalizeText(input.name) || "Audience profile",
    segment: normalizeText(input.segment),
    need: normalizeText(input.need),
    objection: normalizeText(input.objection),
    desiredAction: normalizeText(input.desiredAction),
  };
}

export function createConstraint(
  input: Partial<ProjectKnowledgeConstraint> = {},
): ProjectKnowledgeConstraint {
  return {
    id: normalizeText(input.id) || `con_${nanoid(8)}`,
    label: normalizeText(input.label) || "Project constraint",
    kind: normalizeConstraintKind(input.kind),
    detail: normalizeText(input.detail),
    required: input.required ?? true,
  };
}

export function createReference(
  input: Partial<ProjectKnowledgeReference> = {},
): ProjectKnowledgeReference {
  return {
    id: normalizeText(input.id) || `ref_${nanoid(8)}`,
    label: normalizeText(input.label) || "Project reference",
    kind: normalizeReferenceKind(input.kind),
    url: normalizeText(input.url),
    note: normalizeText(input.note),
  };
}

export function createDecisionLog(
  input: Partial<ProjectKnowledgeDecisionLog> = {},
): ProjectKnowledgeDecisionLog {
  return {
    id: normalizeText(input.id) || `dec_${nanoid(8)}`,
    title: normalizeText(input.title) || "Project decision",
    decision: normalizeText(input.decision),
    rationale: normalizeText(input.rationale),
    owner: normalizeText(input.owner),
    decidedAt: normalizeText(input.decidedAt),
  };
}

export function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeConstraintKind(
  value: unknown,
): ProjectKnowledgeConstraintKind {
  return value === "brand" ||
    value === "legal" ||
    value === "format" ||
    value === "timeline" ||
    value === "accessibility" ||
    value === "custom"
    ? value
    : "custom";
}

function normalizeReferenceKind(value: unknown): ProjectKnowledgeReferenceKind {
  return value === "inspiration" ||
    value === "source" ||
    value === "competitor" ||
    value === "asset" ||
    value === "research" ||
    value === "custom"
    ? value
    : "custom";
}
