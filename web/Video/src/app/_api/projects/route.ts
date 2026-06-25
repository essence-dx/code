import { ZodError } from "zod";
import { apiJson, corsPreflight } from "@/lib/http/cors";
import { InvalidJsonRequestError, readJsonRequest } from "@/lib/http/request-json";
import {
  listSyncedProjects,
  ProjectAccessError,
  ProjectAuthError,
  ProjectDataError,
  ProjectSyncConflictError,
  upsertSyncedProject,
} from "@/lib/projects/server-projects";

export const runtime = "nodejs";

const methods = ["GET", "POST", "OPTIONS"];

export function OPTIONS(request: Request) {
  return corsPreflight(request, methods);
}

export async function GET(request: Request) {
  try {
    return apiJson(request, { ok: true, projects: await listSyncedProjects() }, undefined, methods);
  } catch (error) {
    return projectErrorResponse(request, error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await readJsonRequest(request);
    return apiJson(request, { ok: true, project: await upsertSyncedProject(payload) }, undefined, methods);
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

  if (error instanceof ProjectDataError) {
    return apiJson(request, { ok: false, reason: "Saved project data could not be loaded." }, { status: 409 }, methods);
  }

  if (error instanceof ProjectSyncConflictError) {
    return apiJson(
      request,
      {
        ok: false,
        code: "project_conflict",
        reason: "Project changed in the signed-in library. Refresh or review versions before syncing again.",
        conflict: error.conflict,
      },
      { status: 409 },
      methods,
    );
  }

  if (error instanceof ZodError) {
    return apiJson(request, { ok: false, reason: "Saved project data is invalid." }, { status: 400 }, methods);
  }

  if (error instanceof InvalidJsonRequestError) {
    return apiJson(request, { ok: false, reason: "Request body must be valid JSON." }, { status: 400 }, methods);
  }

  console.error("Project API error", error);
  return apiJson(request, { ok: false, reason: "Project sync failed. Try again." }, { status: 500 }, methods);
}
