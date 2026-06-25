import {
  createAudienceProfile,
  createConstraint,
  createDecisionLog,
  createReference,
} from "@/features/editor/project-knowledge-pack";
import type {
  ProjectKnowledgeAudienceProfile,
  ProjectKnowledgeConstraint,
  ProjectKnowledgeDecisionLog,
  ProjectKnowledgePack,
  ProjectKnowledgeReference,
} from "@/features/editor/types";

export function addAudienceProfile(
  pack: ProjectKnowledgePack,
): ProjectKnowledgePack {
  return {
    ...pack,
    audienceProfiles: [...pack.audienceProfiles, createAudienceProfile()],
  };
}

export function updateAudienceProfile(
  pack: ProjectKnowledgePack,
  id: string,
  updates: Partial<ProjectKnowledgeAudienceProfile>,
): ProjectKnowledgePack {
  return {
    ...pack,
    audienceProfiles: pack.audienceProfiles.map((profile) =>
      profile.id === id ? createAudienceProfile({ ...profile, ...updates }) : profile,
    ),
  };
}

export function removeAudienceProfile(
  pack: ProjectKnowledgePack,
  id: string,
): ProjectKnowledgePack {
  return {
    ...pack,
    audienceProfiles: pack.audienceProfiles.filter((profile) => profile.id !== id),
  };
}

export function addConstraint(pack: ProjectKnowledgePack): ProjectKnowledgePack {
  return {
    ...pack,
    constraints: [...pack.constraints, createConstraint()],
  };
}

export function updateConstraint(
  pack: ProjectKnowledgePack,
  id: string,
  updates: Partial<ProjectKnowledgeConstraint>,
): ProjectKnowledgePack {
  return {
    ...pack,
    constraints: pack.constraints.map((constraint) =>
      constraint.id === id ? createConstraint({ ...constraint, ...updates }) : constraint,
    ),
  };
}

export function removeConstraint(
  pack: ProjectKnowledgePack,
  id: string,
): ProjectKnowledgePack {
  return {
    ...pack,
    constraints: pack.constraints.filter((constraint) => constraint.id !== id),
  };
}

export function addReference(pack: ProjectKnowledgePack): ProjectKnowledgePack {
  return {
    ...pack,
    references: [...pack.references, createReference()],
  };
}

export function updateReference(
  pack: ProjectKnowledgePack,
  id: string,
  updates: Partial<ProjectKnowledgeReference>,
): ProjectKnowledgePack {
  return {
    ...pack,
    references: pack.references.map((reference) =>
      reference.id === id ? createReference({ ...reference, ...updates }) : reference,
    ),
  };
}

export function removeReference(
  pack: ProjectKnowledgePack,
  id: string,
): ProjectKnowledgePack {
  return {
    ...pack,
    references: pack.references.filter((reference) => reference.id !== id),
  };
}

export function addDecisionLog(pack: ProjectKnowledgePack): ProjectKnowledgePack {
  return {
    ...pack,
    decisionLogs: [...pack.decisionLogs, createDecisionLog()],
  };
}

export function updateDecisionLog(
  pack: ProjectKnowledgePack,
  id: string,
  updates: Partial<ProjectKnowledgeDecisionLog>,
): ProjectKnowledgePack {
  return {
    ...pack,
    decisionLogs: pack.decisionLogs.map((log) =>
      log.id === id ? createDecisionLog({ ...log, ...updates }) : log,
    ),
  };
}

export function removeDecisionLog(
  pack: ProjectKnowledgePack,
  id: string,
): ProjectKnowledgePack {
  return {
    ...pack,
    decisionLogs: pack.decisionLogs.filter((log) => log.id !== id),
  };
}
