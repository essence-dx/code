import { apiJson, corsPreflight } from "@/lib/http/cors";
import {
  acceptServerWorkspaceInvitation,
  ServerWorkspaceAccessAuthError,
  ServerWorkspaceAccessForbiddenError,
  ServerWorkspaceInvitationNotFoundError,
  ServerWorkspaceInvitationUnavailableError,
} from "@/lib/projects/server-workspace-access";

export const runtime = "nodejs";

const methods = ["POST", "OPTIONS"];

export function OPTIONS(request: Request) {
  return corsPreflight(request, methods);
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    return apiJson(request, { ok: true, invitation: await acceptServerWorkspaceInvitation(token) }, undefined, methods);
  } catch (error) {
    return invitationAcceptErrorResponse(request, error);
  }
}

function invitationAcceptErrorResponse(request: Request, error: unknown) {
  if (error instanceof ServerWorkspaceAccessAuthError) {
    return apiJson(request, { ok: false, reason: "Sign in with the invited email to accept this workspace invitation." }, { status: 401 }, methods);
  }

  if (error instanceof ServerWorkspaceAccessForbiddenError) {
    return apiJson(request, { ok: false, reason: "This invitation belongs to a different email address." }, { status: 403 }, methods);
  }

  if (error instanceof ServerWorkspaceInvitationNotFoundError) {
    return apiJson(request, { ok: false, reason: "Workspace invitation was not found." }, { status: 404 }, methods);
  }

  if (error instanceof ServerWorkspaceInvitationUnavailableError) {
    return apiJson(request, { ok: false, reason: "This workspace invitation is no longer available." }, { status: 410 }, methods);
  }

  console.error("Workspace invitation accept API error", error);
  return apiJson(request, { ok: false, reason: "Workspace invitation could not be accepted." }, { status: 500 }, methods);
}
