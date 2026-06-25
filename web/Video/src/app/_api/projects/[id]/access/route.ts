import { ZodError } from "zod";
import { apiJson, corsPreflight } from "@/lib/http/cors";
import { InvalidJsonRequestError, readJsonRequest } from "@/lib/http/request-json";
import { InvalidProjectIdError, parseProjectIdParam } from "@/lib/projects/project-id";
import {
  listServerWorkspaceAccess,
  mutateServerWorkspaceAccess,
  ServerWorkspaceAccessAuthError,
  ServerWorkspaceAccessForbiddenError,
  ServerWorkspaceAccessNotFoundError,
} from "@/lib/projects/server-workspace-access";

export const runtime = "nodejs";

const methods = ["GET", "POST", "OPTIONS"];

export function OPTIONS(request: Request) {
  return corsPreflight(request, methods);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return apiJson(request, { ok: true, access: await listServerWorkspaceAccess(parseProjectIdParam(id)) }, undefined, methods);
  } catch (error) {
    return workspaceAccessErrorResponse(request, error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = await readJsonRequest(request);
    return apiJson(request, { ok: true, access: await mutateServerWorkspaceAccess(parseProjectIdParam(id), payload) }, undefined, methods);
  } catch (error) {
    return workspaceAccessErrorResponse(request, error);
  }
}

function workspaceAccessErrorResponse(request: Request, error: unknown) {
  if (error instanceof ServerWorkspaceAccessAuthError) {
    return apiJson(request, { ok: false, reason: "You must be signed in to manage workspace access." }, { status: 401 }, methods);
  }

  if (error instanceof ServerWorkspaceAccessForbiddenError) {
    return apiJson(request, { ok: false, reason: "You do not have permission to manage this workspace." }, { status: 403 }, methods);
  }

  if (error instanceof ServerWorkspaceAccessNotFoundError) {
    return apiJson(request, { ok: false, reason: "Workspace access record was not found." }, { status: 404 }, methods);
  }

  if (error instanceof InvalidProjectIdError) {
    return apiJson(request, { ok: false, reason: "Project id is invalid." }, { status: 400 }, methods);
  }

  if (error instanceof ZodError) {
    return apiJson(request, { ok: false, reason: "Workspace access request is invalid." }, { status: 400 }, methods);
  }

  if (error instanceof InvalidJsonRequestError) {
    return apiJson(request, { ok: false, reason: "Request body must be valid JSON." }, { status: 400 }, methods);
  }

  console.error("Workspace access API error", error);
  return apiJson(request, { ok: false, reason: "Workspace access failed. Try again." }, { status: 500 }, methods);
}
