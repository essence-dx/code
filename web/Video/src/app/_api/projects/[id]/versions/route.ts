import { ZodError } from "zod";
import { apiJson, corsPreflight } from "@/lib/http/cors";
import { InvalidJsonRequestError, readJsonRequest } from "@/lib/http/request-json";
import { InvalidProjectIdError, parseProjectIdParam } from "@/lib/projects/project-id";
import {
  listSyncedProjectVersions,
  ProjectAccessError,
  ProjectAuthError,
  ProjectDataError,
  ProjectVersionNotFoundError,
  restoreSyncedProjectVersion,
} from "@/lib/projects/server-projects";

export const runtime = "nodejs";

const methods = ["GET", "POST", "OPTIONS"];

export function OPTIONS(request: Request) {
  return corsPreflight(request, methods);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return apiJson(request, { ok: true, ...(await listSyncedProjectVersions(parseProjectIdParam(id))) }, undefined, methods);
  } catch (error) {
    return projectVersionErrorResponse(request, error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = await readJsonRequest(request);
    return apiJson(request, { ok: true, project: await restoreSyncedProjectVersion(parseProjectIdParam(id), payload) }, undefined, methods);
  } catch (error) {
    return projectVersionErrorResponse(request, error);
  }
}

function projectVersionErrorResponse(request: Request, error: unknown) {
  if (error instanceof ProjectAuthError) {
    return apiJson(request, { ok: false, reason: "You must be signed in to view project versions." }, { status: 401 }, methods);
  }

  if (error instanceof ProjectAccessError) {
    return apiJson(request, { ok: false, reason: "You do not have access to this project." }, { status: 403 }, methods);
  }

  if (error instanceof InvalidProjectIdError) {
    return apiJson(request, { ok: false, reason: "Project id is invalid." }, { status: 400 }, methods);
  }

  if (error instanceof ProjectVersionNotFoundError) {
    return apiJson(request, { ok: false, reason: "Project version was not found." }, { status: 404 }, methods);
  }

  if (error instanceof ProjectDataError) {
    return apiJson(request, { ok: false, reason: "Saved project version could not be loaded." }, { status: 409 }, methods);
  }

  if (error instanceof ZodError) {
    return apiJson(request, { ok: false, reason: "Project version request is invalid." }, { status: 400 }, methods);
  }

  if (error instanceof InvalidJsonRequestError) {
    return apiJson(request, { ok: false, reason: "Request body must be valid JSON." }, { status: 400 }, methods);
  }

  console.error("Project version API error", error);
  return apiJson(request, { ok: false, reason: "Project version history failed. Try again." }, { status: 500 }, methods);
}
