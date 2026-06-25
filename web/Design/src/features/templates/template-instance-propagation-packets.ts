import type { DesignTemplateSummary } from "@/features/editor/types";
import type {
  TemplateInstanceRollbackPacket,
  TemplateInstanceUpdatePreview,
} from "@/features/templates/template-instance-propagation-types";
import {
  slugify,
  unique,
} from "@/features/templates/template-instance-propagation-utils";

export function createRollbackPacket(input: {
  template: DesignTemplateSummary;
  previews: TemplateInstanceUpdatePreview[];
  generatedAt: string;
}): TemplateInstanceRollbackPacket | null {
  const acceptedPreviews = input.previews.filter(
    (preview) => preview.decision === "accept",
  );

  if (!acceptedPreviews.length) return null;

  const projectIds = acceptedPreviews.map((preview) => preview.projectId);
  const campaignIds = unique(
    acceptedPreviews.flatMap((preview) => preview.campaignIds),
  );
  const payload = {
    generatedAt: input.generatedAt,
    template: {
      id: input.template.id,
      name: input.template.name,
      updatedAt: input.template.updatedAt,
    },
    acceptedProjects: acceptedPreviews.map((preview) => ({
      id: preview.projectId,
      name: preview.projectName,
      latestVersionId: preview.latestVersionId,
      latestVersionAt: preview.latestVersionAt,
      campaigns: preview.campaignNames,
    })),
    rejectedProjectIds: input.previews
      .filter((preview) => preview.decision === "reject")
      .map((preview) => preview.projectId),
  };
  const json = JSON.stringify(payload, null, 2);

  return {
    id: `rollback-${input.template.id}`,
    templateId: input.template.id,
    templateName: input.template.name,
    status: "ready",
    fileName: `${slugify(input.template.name)}-instance-rollback.json`,
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
    projectIds,
    campaignIds,
    createdAt: input.generatedAt,
    steps: [
      "Download this packet before applying accepted template instance updates.",
      "Pin each accepted project to the listed latestVersionId before mutation.",
      "Apply the template update only to accepted project IDs.",
      "If the update is rejected after review, restore the pinned project version and record an audit note.",
    ],
  };
}
