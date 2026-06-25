import { createProjectComplianceReport, getProjectComplianceFileName, type ProjectComplianceReport } from "@/features/projects/project-compliance-report";

export function createProjectComplianceDownload(projectName: string, report: ProjectComplianceReport) {
  const fileName = getProjectComplianceFileName(projectName);

  return {
    body: JSON.stringify(report, null, 2),
    contentDisposition: `attachment; filename="${fileName}"`,
    contentType: "application/json; charset=utf-8",
    fileName,
  };
}

export { createProjectComplianceReport };
