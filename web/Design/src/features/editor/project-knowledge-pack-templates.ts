import {
  createAudienceProfile,
  createConstraint,
  createDecisionLog,
  createReference,
} from "@/features/editor/project-knowledge-pack-items";
import type {
  ProjectKnowledgeAudienceProfile,
  ProjectKnowledgeBrief,
  ProjectKnowledgeConstraint,
  ProjectKnowledgeDecisionLog,
  ProjectKnowledgeReference,
} from "@/features/editor/types";

export type ProjectKnowledgePackTemplateId =
  | "campaign-launch"
  | "stakeholder-report"
  | "event-promo";

export type ProjectKnowledgePackTemplate = {
  id: ProjectKnowledgePackTemplateId;
  label: string;
  description: string;
  brief: ProjectKnowledgeBrief;
  audienceProfiles: ProjectKnowledgeAudienceProfile[];
  constraints: ProjectKnowledgeConstraint[];
  references: ProjectKnowledgeReference[];
  decisionLogs: ProjectKnowledgeDecisionLog[];
};

export const projectKnowledgePackTemplates: ProjectKnowledgePackTemplate[] = [
  {
    id: "campaign-launch",
    label: "Campaign launch",
    description:
      "Brief, audience, guardrails, references, and launch decisions for a multi-format campaign.",
    brief: {
      title: "Campaign launch brief",
      goal: "Introduce the offer across social, website, email, and presentation formats.",
      audiencePromise:
        "A clear reason to act now, reinforced consistently across each deliverable.",
      successMetric: "Launch assets are approved, scheduled, and export-ready.",
      owner: "Marketing lead",
      dueDate: "",
    },
    audienceProfiles: [
      createAudienceProfile({
        name: "Primary buyer",
        segment: "Decision maker",
        need: "Understands the offer quickly and sees practical value.",
        objection: "Needs proof before committing time or budget.",
        desiredAction: "Click through to the primary offer page.",
      }),
      createAudienceProfile({
        name: "Internal stakeholder",
        segment: "Reviewer",
        need: "Can verify brand, compliance, and delivery timing.",
        objection: "Needs a concise rationale for creative choices.",
        desiredAction: "Approve or request focused changes.",
      }),
    ],
    constraints: [
      createConstraint({
        label: "Brand system",
        kind: "brand",
        detail: "Use approved colors, logo spacing, and voice from the active brand kit.",
      }),
      createConstraint({
        label: "Publishing deadline",
        kind: "timeline",
        detail: "Assets must be ready before the scheduled launch window.",
      }),
      createConstraint({
        label: "Accessibility basics",
        kind: "accessibility",
        detail: "Keep text readable, add image alt text, and avoid color-only meaning.",
      }),
    ],
    references: [
      createReference({
        label: "Campaign source brief",
        kind: "source",
        note: "Attach the canonical brief, offer details, or launch document.",
      }),
    ],
    decisionLogs: [
      createDecisionLog({
        title: "Launch direction",
        decision: "Use a direct benefit-led message across all core assets.",
        rationale:
          "A consistent promise keeps the campaign recognizable across formats.",
        owner: "Marketing lead",
      }),
    ],
  },
  {
    id: "stakeholder-report",
    label: "Stakeholder report",
    description:
      "Context for executive summaries, dashboards, progress reports, and board-ready packets.",
    brief: {
      title: "Stakeholder report brief",
      goal: "Turn performance data and narrative updates into an easy-to-review report.",
      audiencePromise:
        "Readers can understand status, risk, and recommended next actions without extra context.",
      successMetric: "Report is approved with no missing source, chart, or decision context.",
      owner: "Reporting owner",
      dueDate: "",
    },
    audienceProfiles: [
      createAudienceProfile({
        name: "Executive reviewer",
        segment: "Leadership",
        need: "Sees progress, risks, and asks in one pass.",
        objection: "Does not want dense raw data without interpretation.",
        desiredAction: "Approve recommendations or unblock a decision.",
      }),
    ],
    constraints: [
      createConstraint({
        label: "Source traceability",
        kind: "legal",
        detail: "Every claim, chart, and metric should link to a source or owner.",
      }),
      createConstraint({
        label: "Decision-ready layout",
        kind: "format",
        detail: "Keep each page scoped to one message, one evidence set, and one ask.",
      }),
    ],
    references: [
      createReference({
        label: "Data source index",
        kind: "research",
        note: "List spreadsheet, analytics, or CRM sources used in the report.",
      }),
    ],
    decisionLogs: [
      createDecisionLog({
        title: "Report framing",
        decision: "Lead with status and impact before detailed appendix content.",
        rationale: "Busy reviewers need a clear decision path before detail.",
        owner: "Reporting owner",
      }),
    ],
  },
  {
    id: "event-promo",
    label: "Event promo",
    description:
      "Reusable planning pack for event pages, invites, social graphics, slides, and signage.",
    brief: {
      title: "Event promotion brief",
      goal: "Create a coordinated event identity and attendee conversion path.",
      audiencePromise:
        "Attendees understand the value, timing, location, and reason to register.",
      successMetric: "Registration, reminder, and day-of assets are complete and consistent.",
      owner: "Event lead",
      dueDate: "",
    },
    audienceProfiles: [
      createAudienceProfile({
        name: "Prospective attendee",
        segment: "External audience",
        need: "Knows what they will learn or gain by attending.",
        objection: "Needs time, place, and value to be obvious.",
        desiredAction: "Register or save the event.",
      }),
    ],
    constraints: [
      createConstraint({
        label: "Event facts",
        kind: "legal",
        detail: "Date, time, venue, speaker names, and registration URLs must be accurate.",
      }),
      createConstraint({
        label: "Multi-format reuse",
        kind: "format",
        detail: "Hero copy and key event details should resize cleanly across formats.",
      }),
    ],
    references: [
      createReference({
        label: "Event details",
        kind: "source",
        note: "Add source page or planning doc with canonical event information.",
      }),
    ],
    decisionLogs: [
      createDecisionLog({
        title: "Primary registration path",
        decision: "Use one primary registration URL across all assets.",
        rationale: "A single path reduces tracking gaps and copy errors.",
        owner: "Event lead",
      }),
    ],
  },
];
