"use client";

import { z } from "zod";
import {
  hostedReviewLinkSummarySchema,
  type UpdateHostedReviewLinkInput,
  type HostedReviewLinkPermission,
  type HostedReviewLinkSummary,
} from "@/lib/projects/hosted-review-link-contracts";
import { assertClientApiRuntime, clientApiUrl } from "@/lib/runtime/client-api";

const listHostedReviewLinksResponseSchema = z.object({
  ok: z.literal(true),
  links: z.array(hostedReviewLinkSummarySchema),
});

const createHostedReviewLinkResponseSchema = z.object({
  ok: z.literal(true),
  link: hostedReviewLinkSummarySchema,
});

const updateHostedReviewLinkResponseSchema = z.object({
  ok: z.literal(true),
  link: hostedReviewLinkSummarySchema,
});

export async function listHostedProjectReviewLinks() {
  assertClientApiRuntime();
  const response = await fetch(clientApiUrl("/api/review-links"), { cache: "no-store", credentials: "include" });
  return (await readHostedReviewResponse(response, listHostedReviewLinksResponseSchema)).links;
}

export async function createHostedProjectReviewLink(input: {
  projectId: string;
  permission: HostedReviewLinkPermission;
  expiresInDays: number;
  exportName?: string;
}) {
  assertClientApiRuntime();
  const response = await fetch(clientApiUrl("/api/review-links"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return (await readHostedReviewResponse(response, createHostedReviewLinkResponseSchema)).link;
}

export async function updateHostedProjectReviewLink(input: UpdateHostedReviewLinkInput) {
  assertClientApiRuntime();
  const response = await fetch(clientApiUrl("/api/review-links"), {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return (await readHostedReviewResponse(response, updateHostedReviewLinkResponseSchema)).link;
}

async function readHostedReviewResponse<T extends z.ZodType>(response: Response, schema: T): Promise<z.infer<T>> {
  const data = await readResponseJson(response);
  if (!response.ok || !isOk(data)) {
    throw new Error(hostedReviewFailureReason(data));
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Hosted review link returned invalid data.");
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

function hostedReviewFailureReason(data: unknown) {
  return isError(data) ? data.reason : "Hosted review link failed.";
}

function isOk(value: unknown): value is { ok: true } {
  return typeof value === "object" && value !== null && "ok" in value && value.ok === true;
}

function isError(value: unknown): value is { reason: string } {
  return typeof value === "object" && value !== null && "reason" in value && typeof value.reason === "string";
}

export type { HostedReviewLinkSummary };
