import { apiJson, corsPreflight } from "@/lib/http/cors";
import { InvalidProjectIdError, parseProjectIdParam } from "@/lib/projects/project-id";
import { ProjectAccessError, ProjectAuthError, ProjectDataError, deleteSyncedProject, getSyncedProject } from "@/lib/projects/server-projects";

export const runtime = "nodejs";

const methods = ["GET", "DELETE", "OPTIONS"];

export function OPTIONS(request: Request) {
  return corsPreflight(request, methods);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const project = await getSyncedProject(parseProjectIdParam(id));

    if (!project) {
      return apiJson(request, { ok: false, reason: "Project not found." }, { status: 404 }, methods);
    }

    return apiJson(request, { ok: true, project }, undefined, methods);
  } catch (error) {
    return projectErrorResponse(request, error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteSyncedProject(parseProjectIdParam(id));
    return apiJson(request, { ok: true }, undefined, methods);
  } catch (error) {
    return projectErrorResponse(request, error);
  }
}

function projectErrorResponse(request: Request, error: unknown) {
  if (error instanceof ProjectAuthError) {
    return apiJson(request, { ok: false, reason: "You must be signed in to sync projects." }, { status: 401 }, methods);
  }

  if (error instanceof ProjectAccessError) {
    return apiJson(request, { ok: false, reason: "You do not have access to this project." }, { status: 403 }, methods);
  }

  if (error instanceof InvalidProjectIdError) {
    return apiJson(request, { ok: false, reason: "Project id is invalid." }, { status: 400 }, methods);
  }

  if (error instanceof ProjectDataError) {
    return apiJson(request, { ok: false, reason: "Saved project data could not be loaded." }, { status: 409 }, methods);
  }

  console.error("Project API error", error);
  return apiJson(request, { ok: false, reason: "Project sync failed. Try again." }, { status: 500 }, methods);
}
