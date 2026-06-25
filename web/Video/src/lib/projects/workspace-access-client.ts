"use client";

import { z } from "zod";
import {
  serverWorkspaceAccessMutationSchema,
  serverWorkspaceAccessSummarySchema,
  type ServerWorkspaceAccessMutation,
  type ServerWorkspaceAccessSummary,
} from "@/lib/projects/workspace-access-contracts";
import { assertClientApiRuntime, clientApiUrl } from "@/lib/runtime/client-api";

const workspaceAccessResponseSchema = z.object({
  ok: z.literal(true),
  access: serverWorkspaceAccessSummarySchema,
});

export async function getCloudWorkspaceAccess(projectId: string) {
  assertClientApiRuntime();
  const response = await fetch(clientApiUrl(`/api/projects/${projectId}/access`), { cache: "no-store", credentials: "include" });
  return (await readWorkspaceAccessResponse(response)).access;
}

export async function mutateCloudWorkspaceAccess(projectId: string, input: ServerWorkspaceAccessMutation) {
  assertClientApiRuntime();
  const payload = serverWorkspaceAccessMutationSchema.parse(input);
  const response = await fetch(clientApiUrl(`/api/projects/${projectId}/access`), {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  return (await readWorkspaceAccessResponse(response)).access;
}

async function readWorkspaceAccessResponse(response: Response) {
  const data = await readResponseJson(response);
  if (!response.ok || !isOk(data)) {
    throw new Error(workspaceAccessFailureReason(data));
  }

  const parsed = workspaceAccessResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Workspace access returned invalid data.");
  }

  return parsed.data;
}

async function readResponseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function workspaceAccessFailureReason(data: unknown) {
  return isError(data) ? data.reason : "Workspace access failed.";
}

function isOk(value: unknown): value is { ok: true } {
  return typeof value === "object" && value !== null && "ok" in value && value.ok === true;
}

function isError(value: unknown): value is { reason: string } {
  return typeof value === "object" && value !== null && "reason" in value && typeof value.reason === "string";
}

export type { ServerWorkspaceAccessSummary };
