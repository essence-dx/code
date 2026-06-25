"use client";

import { z } from "zod";
import { serverWorkspaceInvitationAcceptanceSchema } from "@/lib/projects/workspace-access-contracts";
import { assertClientApiRuntime, clientApiUrl } from "@/lib/runtime/client-api";

const acceptWorkspaceInvitationResponseSchema = z.object({
  ok: z.literal(true),
  invitation: serverWorkspaceInvitationAcceptanceSchema,
});

export async function acceptCloudWorkspaceInvitation(token: string) {
  assertClientApiRuntime();
  const response = await fetch(clientApiUrl(`/api/workspace-invitations/${encodeURIComponent(token)}/accept`), {
    method: "POST",
    credentials: "include",
  });
  const data = await readResponseJson(response);

  if (!response.ok || !isOk(data)) {
    throw new Error(invitationFailureReason(data));
  }

  const parsed = acceptWorkspaceInvitationResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Workspace invitation returned invalid data.");
  }

  return parsed.data.invitation;
}

async function readResponseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function invitationFailureReason(data: unknown) {
  return isError(data) ? data.reason : "Workspace invitation could not be accepted.";
}

function isOk(value: unknown): value is { ok: true } {
  return typeof value === "object" && value !== null && "ok" in value && value.ok === true;
}

function isError(value: unknown): value is { reason: string } {
  return typeof value === "object" && value !== null && "reason" in value && typeof value.reason === "string";
}
