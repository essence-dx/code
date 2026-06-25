import type { ProjectRecord } from "@/db/schema";
import { createProjectAuditSearchRows } from "@/features/projects/project-audit-search";
import { loadProjectAuditSnapshot } from "@/features/projects/server/project-audit-service";

export async function loadProjectAuditSearchRows(projects: ProjectRecord[]) {
  const auditProjects = await Promise.all(
    projects.map(async (project) => {
      const snapshot = await loadProjectAuditSnapshot(project);

      return {
        auditLog: snapshot.auditLog,
        id: project.id,
        name: project.name,
      };
    }),
  );

  return createProjectAuditSearchRows(auditProjects);
}
