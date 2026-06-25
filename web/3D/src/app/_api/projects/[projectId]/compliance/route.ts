import { headers } from "next/headers";
import { createProjectComplianceDownload, createProjectComplianceReport } from "@/features/projects/project-compliance-download";
import { requireProjectRole } from "@/features/projects/server/project-access-service";
import { loadProjectAuditSnapshot } from "@/features/projects/server/project-audit-service";
import { auth } from "@/lib/auth";

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const access = await requireProjectRole(projectId, userId, "admin");

  if ("error" in access) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  const snapshot = await loadProjectAuditSnapshot(access.project);
  const report = createProjectComplianceReport({
    accessGrants: snapshot.accessGrants,
    auditLog: snapshot.auditLog,
    origin: new URL(request.url).origin,
    project: access.project,
    sceneData: snapshot.sceneData,
    versions: snapshot.versions,
  });
  const download = new URL(request.url).searchParams.get("download") === "1";

  if (download) {
    const file = createProjectComplianceDownload(access.project.name, report);

    return new Response(file.body, {
      headers: {
        "Content-Disposition": file.contentDisposition,
        "Content-Type": file.contentType,
      },
    });
  }

  return Response.json({ report });
}
