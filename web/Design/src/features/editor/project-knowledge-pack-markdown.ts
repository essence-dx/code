import { normalizeProjectKnowledgePack } from "@/features/editor/project-knowledge-pack";
import type {
  ProjectKnowledgeAudienceProfile,
  ProjectKnowledgeConstraint,
  ProjectKnowledgeDecisionLog,
  ProjectKnowledgePack,
  ProjectKnowledgeReference,
} from "@/features/editor/types";

export function createProjectKnowledgePackMarkdown(
  pack: ProjectKnowledgePack,
  projectName = "Project",
) {
  const normalized = normalizeProjectKnowledgePack(pack);
  const lines = [
    `# ${markdownText(normalized.brief.title || `${projectName} knowledge pack`)}`,
    "",
    `Updated: ${normalized.updatedAt}`,
    "",
    "## Brief",
    "",
    `- Goal: ${markdownText(normalized.brief.goal)}`,
    `- Audience promise: ${markdownText(normalized.brief.audiencePromise)}`,
    `- Success metric: ${markdownText(normalized.brief.successMetric)}`,
    `- Owner: ${markdownText(normalized.brief.owner)}`,
    `- Due date: ${markdownText(normalized.brief.dueDate)}`,
    "",
    "## Audience Profiles",
    "",
    ...formatAudienceProfiles(normalized.audienceProfiles),
    "",
    "## Constraints",
    "",
    ...formatConstraints(normalized.constraints),
    "",
    "## References",
    "",
    ...formatReferences(normalized.references),
    "",
    "## Decision Log",
    "",
    ...formatDecisionLogs(normalized.decisionLogs),
  ];

  return `${lines.join("\n")}\n`;
}

function markdownText(value: string) {
  return value ? value.replace(/\s+/g, " ") : "Not set";
}

function formatAudienceProfiles(profiles: ProjectKnowledgeAudienceProfile[]) {
  if (profiles.length === 0) return ["No audience profiles captured."];

  return profiles.flatMap((profile) => [
    `### ${markdownText(profile.name)}`,
    "",
    `- Segment: ${markdownText(profile.segment)}`,
    `- Need: ${markdownText(profile.need)}`,
    `- Objection: ${markdownText(profile.objection)}`,
    `- Desired action: ${markdownText(profile.desiredAction)}`,
    "",
  ]);
}

function formatConstraints(constraints: ProjectKnowledgeConstraint[]) {
  if (constraints.length === 0) return ["No constraints captured."];

  return constraints.map(
    (constraint) =>
      `- ${markdownText(constraint.label)} (${constraint.kind}${constraint.required ? ", required" : ""}): ${markdownText(constraint.detail)}`,
  );
}

function formatReferences(references: ProjectKnowledgeReference[]) {
  if (references.length === 0) return ["No references captured."];

  return references.map(
    (reference) =>
      `- ${markdownText(reference.label)} (${reference.kind}): ${markdownText(reference.url || reference.note)}`,
  );
}

function formatDecisionLogs(logs: ProjectKnowledgeDecisionLog[]) {
  if (logs.length === 0) return ["No decisions logged."];

  return logs.flatMap((log) => [
    `### ${markdownText(log.title)}`,
    "",
    `- Decision: ${markdownText(log.decision)}`,
    `- Rationale: ${markdownText(log.rationale)}`,
    `- Owner: ${markdownText(log.owner)}`,
    `- Decided at: ${markdownText(log.decidedAt)}`,
    "",
  ]);
}
