import type { WorkflowTemplateDefinition } from "@/features/automation/workflow-template-marketplace-types";

export const workflowTemplateDefinitions: WorkflowTemplateDefinition[] = [
  {
    id: "launch-control-room",
    name: "Launch control room",
    description:
      "Coordinates campaign launch exports, publishing reminders, and recurring campaign cadence for internal launch teams.",
    category: "campaign-ops",
    requiredRole: "admin",
    versions: [
      {
        version: "2.0.0",
        releasedAt: "2026-05-01T09:00:00.000Z",
        summary: "Initial multi-recipe launch workflow.",
        recipeSteps: [
          {
            id: "launch-export",
            recipeId: "scheduled-export",
            title: "Queue launch export",
            dependencyDetail:
              "Needs an active design target that can receive a durable export job.",
            rollbackNote:
              "Cancel pending export jobs before restoring the previous launch package.",
          },
          {
            id: "launch-reminder",
            recipeId: "publishing-reminder",
            title: "Create launch reminder",
            dependencyDetail:
              "Needs an active design target for the content planner reminder.",
            rollbackNote:
              "Remove generated content planner reminders if the launch date changes.",
          },
        ],
      },
      {
        version: "2.1.0",
        releasedAt: "2026-05-19T09:00:00.000Z",
        summary: "Adds campaign cadence dependency and richer rollback notes.",
        recipeSteps: [
          {
            id: "launch-export",
            recipeId: "scheduled-export",
            title: "Queue launch export",
            dependencyDetail:
              "Needs an active design target that can receive a durable export job.",
            rollbackNote:
              "Cancel pending export jobs before restoring the previous launch package.",
          },
          {
            id: "launch-reminder",
            recipeId: "publishing-reminder",
            title: "Create launch reminder",
            dependencyDetail:
              "Needs an active design target for the content planner reminder.",
            rollbackNote:
              "Remove generated content planner reminders if the launch date changes.",
          },
          {
            id: "launch-cadence",
            recipeId: "campaign-cadence",
            title: "Schedule campaign cadence",
            dependencyDetail:
              "Needs a campaign with linked deliverables and a launch date.",
            rollbackNote:
              "Restore content planner cadence entries from the previous campaign schedule packet.",
          },
        ],
      },
    ],
  },
  {
    id: "review-accelerator",
    name: "Review accelerator",
    description:
      "Packages review nudges and publishing reminders into a repeatable internal approval workflow.",
    category: "review",
    requiredRole: "member",
    versions: [
      {
        version: "1.4.0",
        releasedAt: "2026-05-19T09:00:00.000Z",
        summary: "Adds dependency-aware review nudge recovery.",
        recipeSteps: [
          {
            id: "review-nudge",
            recipeId: "review-nudge",
            title: "Nudge reviewers",
            dependencyDetail:
              "Needs open review tasks grouped by project before it can create value.",
            rollbackNote:
              "Send a cancellation note if reviewers were nudged for a stale task queue.",
          },
          {
            id: "review-reminder",
            recipeId: "publishing-reminder",
            title: "Schedule review reminder",
            dependencyDetail:
              "Needs a design target for a visible review reminder.",
            rollbackNote:
              "Remove review reminder planner items when approval is no longer needed.",
          },
        ],
      },
    ],
  },
  {
    id: "export-recovery-kit",
    name: "Export recovery kit",
    description:
      "Gives teams a reusable export retry and rollback workflow for production handoff failures.",
    category: "export-ops",
    requiredRole: "admin",
    versions: [
      {
        version: "1.2.0",
        releasedAt: "2026-05-19T09:00:00.000Z",
        summary: "Adds rollback notes for server export retry evidence.",
        recipeSteps: [
          {
            id: "recovery-export",
            recipeId: "scheduled-export",
            title: "Queue recovery export",
            dependencyDetail:
              "Needs a design target and release enforcement clearance before queueing a retry.",
            rollbackNote:
              "Keep the previous completed artifact until the recovery export is verified.",
          },
        ],
      },
    ],
  },
];

export function getWorkflowTemplateDefinition(templateId: string) {
  return (
    workflowTemplateDefinitions.find(
      (template) => template.id === templateId,
    ) ?? null
  );
}
