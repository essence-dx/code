import type {
  MarketplaceCreatorOperationPacket,
  MarketplaceCreatorSubmission,
} from "@/features/templates/marketplace-creator-operations-types";
import { slugify } from "@/features/templates/marketplace-creator-operations-utils";

export function createOperationPacket(input: {
  submission: MarketplaceCreatorSubmission;
  generatedAt: string;
}): MarketplaceCreatorOperationPacket {
  const packet = {
    generatedAt: input.generatedAt,
    templateId: input.submission.templateId,
    templateName: input.submission.templateName,
    creatorDetail: input.submission.creatorDetail,
    version: input.submission.version,
    status: input.submission.status,
    score: input.submission.score,
    submissionStage: input.submission.submissionStage,
    trustScore: input.submission.trustScore,
    licenseEvidence: input.submission.licenseEvidence,
    rollbackPlan: {
      status: input.submission.rollbackPlan.status,
      score: input.submission.rollbackPlan.score,
      summary: input.submission.rollbackPlan.summary,
      restorePointCount: input.submission.rollbackPlan.restorePointCount,
      latestRestoreAt: input.submission.rollbackPlan.latestRestoreAt,
      installCount: input.submission.rollbackPlan.installCount,
      dependencies: input.submission.rollbackPlan.dependencies.map(
        (dependency) => ({
          projectId: dependency.projectId,
          projectName: dependency.projectName,
          relation: dependency.relation,
          status: dependency.status,
          versionCount: dependency.versionCount,
          latestVersionAt: dependency.latestVersionAt,
        }),
      ),
    },
    moderationRoute: input.submission.moderationRoute,
    versionTimeline: input.submission.versionTimeline,
    stats: input.submission.stats,
  };
  const downloadJson = JSON.stringify(packet, null, 2);

  return {
    fileName: `${slugify(input.submission.templateName)}-creator-operations.json`,
    downloadJson,
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(
      downloadJson,
    )}`,
  };
}
