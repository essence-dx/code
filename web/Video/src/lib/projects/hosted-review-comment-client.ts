"use client";

import { z } from "zod";
import {
  hostedReviewCommentSchema,
  type CreateHostedReviewCommentInput,
  type HostedReviewComment,
} from "@/lib/projects/hosted-review-link-contracts";
import { assertClientApiRuntime, clientApiUrl } from "@/lib/runtime/client-api";

const listHostedReviewCommentsResponseSchema = z.object({
  ok: z.literal(true),
  comments: z.array(hostedReviewCommentSchema),
});

const createHostedReviewCommentResponseSchema = z.object({
  ok: z.literal(true),
  comment: hostedReviewCommentSchema,
});

export async function listHostedReviewComments(token: string) {
  assertClientApiRuntime();
  const response = await fetch(clientApiUrl(`/api/review-links/${encodeURIComponent(token)}/comments`), {
    cache: "no-store",
  });
  return (await readHostedReviewCommentResponse(response, listHostedReviewCommentsResponseSchema)).comments;
}

export async function createHostedReviewComment(token: string, input: CreateHostedReviewCommentInput) {
  assertClientApiRuntime();
  const response = await fetch(clientApiUrl(`/api/review-links/${encodeURIComponent(token)}/comments`), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await readHostedReviewCommentResponse(response, createHostedReviewCommentResponseSchema)).comment;
}

async function readHostedReviewCommentResponse<T extends z.ZodType>(response: Response, schema: T): Promise<z.infer<T>> {
  const data = await readResponseJson(response);
  if (!response.ok || !isOk(data)) {
    throw new Error(hostedReviewCommentFailureReason(data));
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Hosted review comments returned invalid data.");
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

function hostedReviewCommentFailureReason(data: unknown) {
  return isError(data) ? data.reason : "Hosted review comments failed.";
}

function isOk(value: unknown): value is { ok: true } {
  return typeof value === "object" && value !== null && "ok" in value && value.ok === true;
}

function isError(value: unknown): value is { reason: string } {
  return typeof value === "object" && value !== null && "reason" in value && typeof value.reason === "string";
}

export type { HostedReviewComment };
