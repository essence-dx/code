import type {
  ExportCertificationArtifactDefinition,
  ExportCertificationPacket,
  ExportCertificationQaMatrix,
  ExportCertificationSignoff,
  ExportCertificationStatus,
} from "@/features/export-certification/export-certification-types";

export function createExportCertificationPacket(input: {
  definition: ExportCertificationArtifactDefinition;
  status: ExportCertificationStatus;
  generatedAt: string;
  projectIds: string[];
  projectNames: string[];
  qaMatrix: ExportCertificationQaMatrix;
  stakeholderSignoff: ExportCertificationSignoff;
}): ExportCertificationPacket {
  const payload = {
    schema: "essence.exportCertification.v1",
    generatedAt: input.generatedAt,
    artifact: input.definition.artifact,
    label: input.definition.label,
    status: input.status,
    projectIds: input.projectIds,
    projectNames: input.projectNames,
    qaMatrix: {
      status: input.qaMatrix.status,
      score: input.qaMatrix.score,
      checks: input.qaMatrix.checks,
    },
    stakeholderSignoff: input.stakeholderSignoff,
  };

  return {
    id: `${input.definition.artifact}-certification-packet`,
    title: `${input.definition.label} packet`,
    artifact: input.definition.artifact,
    status: input.status,
    generatedAt: input.generatedAt,
    projectIds: input.projectIds,
    checks: input.qaMatrix.checks.map((check) => check.label),
    signoffSummary: input.stakeholderSignoff.summary,
    downloadJson: JSON.stringify(payload, null, 2),
  };
}
